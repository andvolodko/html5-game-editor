import { EventBus, type RendererKind } from "@game-editor/core";
import type {
  ComponentRegistry,
  NodePointerEventName,
  ScriptPerformanceStats,
  ScriptRuntimeServices,
} from "@game-editor/game-components";
import {
  canMoveNode,
  flattenNodes,
  flattenSubtree,
  findNodeByName,
  getScriptComponents,
  moveNodeInScene,
  resolveScenePrefabs,
  resolveSceneRuntimeTransform2D,
  SceneIndex,
  type PrefabCatalog,
  type RuntimeTransform2D,
  type SceneData,
  type SceneNodeData,
  type SceneRenderer,
} from "@game-editor/scene";
import { ScriptHost } from "./script-host.js";
import {
  patchAnimatedSpritePlayback,
  patchModel3DPlayback,
  patchNodeText,
  patchSpriteAssetId,
  patchTransform2D,
  patchTransform3D,
} from "./script-scene-io.js";
import { destroyNodeInScene, spawnModel3DInScene } from "./script-scene-spawn.js";
import { cloneNamedNodeInScene } from "./script-scene-clone.js";
import { RuntimeNodeEvents } from "./runtime-node-events.js";
import {
  buildPerformanceStats,
  sampleRendererStats,
} from "./runtime-performance.js";
import {
  RuntimeRendererHost,
  type RuntimeRendererRegistration,
} from "./runtime-renderer-host.js";
import {
  createRuntimeScriptServices,
  type RuntimeScriptServiceHost,
} from "./runtime-script-services.js";

export type { RuntimeRendererRegistration };

export interface GameRuntimeOptions {
  /**
   * Explicit script catalog shared with the game's `registerGameComponents`.
   * When omitted, Script components load as data only (no live instances).
   */
  components?: ComponentRegistry;
  /**
   * Event bus + scene navigation for script `create` factories.
   * When omitted, a session EventBus is created and changeScene is a no-op
   * until `setChangeSceneHandler` is called.
   */
  services?: ScriptRuntimeServices;
  /** Prefab documents keyed by catalogue assetId. */
  prefabs?: PrefabCatalog;
}

/**
 * Minimal game runtime shell. Does not depend on editor packages.
 * Renderers are registered explicitly so Three.js stays optional per game.
 */
export class GameRuntime implements RuntimeScriptServiceHost {
  readonly bus: EventBus;
  readonly sceneIndex = new SceneIndex();
  private readonly rendererHost = new RuntimeRendererHost();
  private readonly nodeEvents = new RuntimeNodeEvents();
  private scene: SceneData | undefined;
  private readonly scriptHost: ScriptHost;
  private changeSceneHandler:
    | ((sceneId: string) => void | Promise<void>)
    | undefined;
  private lastTickMs = 0;
  private lastRenderPassMs = 0;
  private lastFrameDt = 0;
  private paused = false;
  private readonly spawnedNodeIds = new Set<string>();
  private prefabs: PrefabCatalog;
  private disposed = false;
  private performanceStats: ScriptPerformanceStats = {
    frameTimeMs: 0,
    fps: 0,
    drawCalls: 0,
    triangles: 0,
    gameLogicMs: 0,
    rendererMs: 0,
    canvas: 0,
    displayObjects: 0,
  };

  constructor(options: GameRuntimeOptions = {}) {
    this.bus = options.services?.bus ?? new EventBus();
    this.changeSceneHandler = options.services?.changeScene;
    const services = createRuntimeScriptServices(this, options.services ?? {});
    this.scriptHost = new ScriptHost(
      options.components,
      services,
      (nodeId) => this.resolveNodeTransform(nodeId),
      () => ({
        getNode: (nodeId) => this.sceneIndex.getNode(nodeId),
        getParentId: (nodeId) => this.sceneIndex.getParentId(nodeId),
        findByName: (name) =>
          this.scene ? findNodeByName(this.scene, name) : undefined,
      }),
    );
    this.prefabs = options.prefabs ?? new Map();
  }

  getChangeSceneHandler():
    | ((sceneId: string) => void | Promise<void>)
    | undefined {
    return this.changeSceneHandler;
  }

  subscribeNodeClick(nodeId: string, handler: () => void): () => void {
    return this.nodeEvents.subscribeClick(nodeId, handler);
  }

  subscribeNodePointerEvent(
    nodeId: string,
    event: NodePointerEventName,
    handler: () => void,
  ): () => void {
    return this.nodeEvents.subscribePointer(nodeId, event, handler);
  }

  setPrefabCatalog(prefabs: PrefabCatalog): void {
    this.prefabs = prefabs;
  }

  getBus(): EventBus {
    return this.bus;
  }

  /**
   * Forward a renderer pointer click to scripts subscribed via `onNodeClick`.
   * No-op when an external `onNodeClick` was provided in options.
   */
  emitNodeClick(nodeId: string): void {
    if (this.paused) {
      return;
    }
    this.nodeEvents.emitClick(nodeId);
  }

  /**
   * Forward a renderer pointer event to scripts subscribed via `onNodePointerEvent`.
   * Walks ancestors so a Button on a parent still receives child visual hits.
   * Also fans `pointertap` into legacy `onNodeClick` subscribers.
   */
  emitNodePointerEvent(nodeId: string, event: NodePointerEventName): void {
    if (this.paused) {
      return;
    }
    let current: string | undefined = nodeId;
    const visited = new Set<string>();
    while (current !== undefined && !visited.has(current)) {
      visited.add(current);
      this.nodeEvents.emitPointer(current, event);
      if (event === "pointertap") {
        this.emitNodeClick(current);
      }
      current = this.sceneIndex.getParentId(current);
    }
  }

  /** Replace scene-navigation handler (preview / game bootstrap). */
  setChangeSceneHandler(
    handler: ((sceneId: string) => void | Promise<void>) | undefined,
  ): void {
    this.changeSceneHandler = handler;
  }

  registerRenderer(registration: RuntimeRendererRegistration): void {
    this.rendererHost.register(registration);
    if (this.paused) {
      registration.renderer.setPlaybackPaused?.(true);
    }
  }

  /** Drop renderer registrations. Call after destroying the previous stack. */
  clearRenderers(): void {
    this.rendererHost.clear();
  }

  loadScene(scene: SceneData): void {
    this.disposed = false;
    this.spawnedNodeIds.clear();
    this.nodeEvents.clear();
    const { scene: resolved, warnings } = resolveScenePrefabs(scene, this.prefabs);
    for (const warning of warnings) {
      console.warn(`[prefab] ${warning.message}`);
    }
    this.scene = resolved;
    this.sceneIndex.rebuild(resolved);
    const nodes = flattenNodes(resolved);
    for (const registration of this.rendererHost.getOrdered()) {
      registration.renderer.clear();
      for (const node of nodes) {
        if (registration.accepts && !registration.accepts(node)) {
          continue;
        }
        registration.renderer.createNode(node);
      }
    }
    this.scriptHost.attachScene(resolved);
  }

  getScene(): SceneData | undefined {
    return this.scene;
  }

  /** Number of live script instances attached after the last loadScene. */
  getScriptInstanceCount(): number {
    return this.scriptHost.getInstanceCount();
  }

  /**
   * Push Inspector property edits onto an existing live script instance.
   * Does not recreate the component.
   */
  notifyScriptProperties(
    nodeId: string,
    componentId: string,
    properties: Readonly<Record<string, unknown>>,
  ): void {
    const node = this.sceneIndex.getNode(nodeId);
    const script = node
      ? getScriptComponents(node).find(
          (component) => component.id === componentId,
        )
      : undefined;
    if (script) {
      script.properties = { ...properties };
    }
    this.scriptHost.notifyPropertiesChanged(nodeId, componentId, properties);
  }

  /** Tear down live scripts (stops looping audio, unsubscribes bus handlers). */
  dispose(): void {
    this.scriptHost.clear();
    this.nodeEvents.clear();
    this.spawnedNodeIds.clear();
    this.disposed = true;
  }

  /** Freeze script `update` and playback input. Renderers may still present. */
  setPaused(paused: boolean): void {
    this.paused = paused;
    for (const registration of this.rendererHost.getOrdered()) {
      registration.renderer.setPlaybackPaused?.(paused);
    }
  }

  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Optional per-frame hook for script `update`. Not driven automatically in v1.
   */
  tick(dt: number): void {
    if (this.paused || this.disposed) {
      return;
    }
    this.lastFrameDt = Math.max(0, dt);
    const startedMs = performance.now();
    this.scriptHost.tick(dt);
    this.lastTickMs = performance.now() - startedMs;
  }

  resize(width: number, height: number): void {
    for (const registration of this.rendererHost.getOrdered()) {
      registration.renderer.resize(width, height);
    }
  }

  render(): void {
    const startedMs = performance.now();
    for (const registration of this.rendererHost.getOrdered()) {
      registration.renderer.render();
    }
    this.lastRenderPassMs = performance.now() - startedMs;
    this.refreshPerformanceStats();
  }

  getRegisteredRenderers(): RendererKind[] {
    return this.rendererHost.kinds();
  }

  /** Latest frame metrics (also exposed via script `getPerformanceStats`). */
  getPerformanceStats(): Readonly<ScriptPerformanceStats> {
    return this.performanceStats;
  }

  writeTransform2D(
    nodeId: string,
    patch: Parameters<NonNullable<ScriptRuntimeServices["setTransform2D"]>>[1],
  ): void {
    const node = patchTransform2D(this.scene, nodeId, patch, this.sceneIndex);
    if (!node) {
      return;
    }
    this.forOwningRenderers(node, (renderer) => {
      renderer.syncTransform(node);
    });
  }

  writeTransform3D(
    nodeId: string,
    patch: Parameters<NonNullable<ScriptRuntimeServices["setTransform3D"]>>[1],
  ): void {
    const node = patchTransform3D(this.scene, nodeId, patch, this.sceneIndex);
    if (!node) {
      return;
    }
    this.forOwningRenderers(node, (renderer) => {
      renderer.syncTransform(node);
    });
  }

  writeModel3DPlayback(
    nodeId: string,
    patch: Parameters<
      NonNullable<ScriptRuntimeServices["setModel3DPlayback"]>
    >[1],
  ): void {
    const node = patchModel3DPlayback(
      this.scene,
      nodeId,
      patch,
      this.sceneIndex,
    );
    if (!node) {
      return;
    }
    this.forOwningRenderers(node, (renderer) => {
      renderer.updateNode(node);
    });
  }

  writeText(nodeId: string, text: string): void {
    const node = patchNodeText(this.scene, nodeId, text, this.sceneIndex);
    if (!node) {
      return;
    }
    this.forOwningRenderers(node, (renderer) => {
      renderer.updateNode(node);
    });
  }

  writeSpriteAssetId(nodeId: string, assetId: string): void {
    const node = patchSpriteAssetId(this.scene, nodeId, assetId, this.sceneIndex);
    if (!node) {
      return;
    }
    this.forOwningRenderers(node, (renderer) => {
      renderer.updateNode(node);
    });
  }

  writeAnimatedSpritePlayback(
    nodeId: string,
    patch: Parameters<
      NonNullable<ScriptRuntimeServices["setAnimatedSpritePlayback"]>
    >[1],
  ): void {
    const node = patchAnimatedSpritePlayback(
      this.scene,
      nodeId,
      patch,
      this.sceneIndex,
    );
    if (!node) {
      return;
    }
    this.forOwningRenderers(node, (renderer) => {
      renderer.updateNode(node);
    });
  }

  reparentLiveNode(
    nodeId: string,
    parentId: string | undefined,
    index?: number,
  ): void {
    if (!this.scene || !canMoveNode(this.scene, nodeId, parentId)) {
      return;
    }
    const siblings =
      parentId === undefined
        ? this.scene.nodes
        : this.sceneIndex.getNode(parentId)?.children;
    if (!siblings) {
      return;
    }
    const insertIndex =
      index === undefined
        ? siblings.length
        : Math.max(0, Math.min(Math.floor(index), siblings.length));
    const moved = moveNodeInScene(this.scene, nodeId, parentId, insertIndex);
    this.sceneIndex.reparentNode(nodeId, parentId);
    this.forOwningRenderers(moved.node, (renderer) => {
      renderer.reparentNode(nodeId, parentId, moved.toIndex);
    });
  }

  readBoneWorldTransform(
    nodeId: string,
    boneName: string,
  ): ReturnType<
    NonNullable<ScriptRuntimeServices["getModel3DBoneWorldTransform"]>
  > {
    for (const registration of this.rendererHost.getOrdered()) {
      const transform = registration.renderer.getBoneWorldTransform?.(
        nodeId,
        boneName,
      );
      if (transform) {
        return {
          position: transform.position,
          rotation: transform.rotation,
          scale: { x: 1, y: 1, z: 1 },
        };
      }
    }
    return undefined;
  }

  spawnModel3DNode(
    options: Parameters<
      NonNullable<ScriptRuntimeServices["spawnModel3D"]>
    >[0],
  ): string | undefined {
    if (!this.scene) {
      return undefined;
    }
    const node = spawnModel3DInScene(this.scene, options);
    if (!node) {
      return undefined;
    }
    this.spawnedNodeIds.add(node.id);
    this.sceneIndex.addNode(node);
    this.forAcceptingRenderers(node, (renderer) => {
      renderer.createNode(node);
    });
    return node.id;
  }

  cloneNamedNode(
    sourceName: string,
    index: number,
    columns?: number,
  ): string | undefined {
    if (!this.scene) {
      return undefined;
    }
    const node = cloneNamedNodeInScene(
      this.scene,
      sourceName,
      index,
      columns,
    );
    if (!node) {
      return undefined;
    }
    this.sceneIndex.addNode(node);
    for (const created of flattenSubtree(node)) {
      this.spawnedNodeIds.add(created.id);
      this.forAcceptingRenderers(created, (renderer) => {
        renderer.createNode(created);
      });
    }
    return node.id;
  }

  setNodeVisible(nodeId: string, visible: boolean): void {
    for (const registration of this.rendererHost.getOrdered()) {
      registration.renderer.setNodeVisible?.(nodeId, visible);
    }
  }

  setNodeAlpha(nodeId: string, alpha: number): void {
    for (const registration of this.rendererHost.getOrdered()) {
      registration.renderer.setNodeAlpha?.(nodeId, alpha);
    }
  }

  setNodeCursor(nodeId: string, cursor: string): void {
    for (const registration of this.rendererHost.getOrdered()) {
      registration.renderer.setNodeCursor?.(nodeId, cursor);
    }
  }

  destroySpawnedNode(nodeId: string): void {
    if (!this.scene || !this.spawnedNodeIds.has(nodeId)) {
      return;
    }
    const removed = destroyNodeInScene(this.scene, nodeId);
    this.sceneIndex.removeNode(nodeId);
    for (const node of removed) {
      this.spawnedNodeIds.delete(node.id);
      for (const registration of this.rendererHost.getOrdered()) {
        registration.renderer.destroyNode(node.id);
      }
    }
  }

  /**
   * Resolve a persistent live transform for a script context.
   * Prefers a renderer handle so assignments skip scene patches / syncTransform.
   */
  private resolveNodeTransform(nodeId: string): RuntimeTransform2D {
    for (const registration of this.rendererHost.getOrdered()) {
      const live = registration.renderer.getRuntimeTransform2D?.(nodeId);
      if (live) {
        return live;
      }
    }
    return resolveSceneRuntimeTransform2D(this.scene, nodeId);
  }

  private refreshPerformanceStats(): void {
    this.performanceStats = buildPerformanceStats({
      frameDt: this.lastFrameDt,
      gameLogicMs: this.lastTickMs,
      renderPassMs: this.lastRenderPassMs,
      renderStats: sampleRendererStats(this.rendererHost.getOrdered()),
    });
  }

  private forAcceptingRenderers(
    node: SceneNodeData,
    fn: (renderer: SceneRenderer) => void,
  ): void {
    for (const registration of this.rendererHost.getOrdered()) {
      if (registration.accepts && !registration.accepts(node)) {
        continue;
      }
      fn(registration.renderer);
    }
  }

  /**
   * Hybrid stacks register multiple renderers; only the slot that accepted
   * the node at loadScene owns a runtime object for it.
   */
  private forOwningRenderers(
    node: SceneNodeData,
    fn: (renderer: SceneRenderer) => void,
  ): void {
    for (const registration of this.rendererHost.getOrdered()) {
      if (registration.accepts && !registration.accepts(node)) {
        continue;
      }
      if (
        registration.renderer.hasNode &&
        !registration.renderer.hasNode(node.id)
      ) {
        continue;
      }
      fn(registration.renderer);
    }
  }
}
