import { EventBus, type RendererKind } from "@game-editor/core";
import type {
  ComponentRegistry,
  NodePointerEventName,
  ScriptPerformanceStats,
  ScriptRuntimeServices,
} from "@game-editor/game-components";
import {
  findNodeByName,
  getScriptComponents,
  IDENTITY_SCALE_3D,
  resolveSceneRuntimeTransform2D,
  type PrefabCatalog,
  type RuntimeTransform2D,
  type RuntimeTransform3D,
  type SceneData,
  type SceneIndex,
} from "@game-editor/scene";
import { ScriptHost } from "./script-host.js";
import { RuntimeNodeEvents } from "./runtime-node-events.js";
import {
  buildPerformanceStats,
  sampleRendererStats,
} from "./runtime-performance.js";
import {
  RuntimeRendererHost,
  type RuntimeRendererRegistration,
} from "./runtime-renderer-host.js";
import { RuntimeSceneHost } from "./runtime-scene-host.js";
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
  private readonly rendererHost = new RuntimeRendererHost();
  private readonly sceneHost = new RuntimeSceneHost(this.rendererHost);
  private readonly nodeEvents = new RuntimeNodeEvents();
  private readonly scriptHost: ScriptHost;
  private changeSceneHandler:
    | ((sceneId: string) => void | Promise<void>)
    | undefined;
  private lastTickMs = 0;
  private lastRenderPassMs = 0;
  private lastFrameDt = 0;
  private paused = false;
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
    if (options.prefabs) {
      this.sceneHost.setPrefabCatalog(options.prefabs);
    }
    const services = createRuntimeScriptServices(this, options.services ?? {});
    this.scriptHost = new ScriptHost(
      options.components,
      services,
      (nodeId) => this.resolveNodeTransform(nodeId),
      () => ({
        getNode: (nodeId) => this.sceneIndex.getNode(nodeId),
        getParentId: (nodeId) => this.sceneIndex.getParentId(nodeId),
        findByName: (name) => {
          const scene = this.getScene();
          return scene ? findNodeByName(scene, name) : undefined;
        },
      }),
      (nodeId) => this.resolveNodeTransform3D(nodeId),
    );
  }

  get sceneIndex(): SceneIndex {
    return this.sceneHost.sceneIndex;
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
    this.sceneHost.setPrefabCatalog(prefabs);
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
    this.nodeEvents.clear();
    const resolved = this.sceneHost.loadScene(scene);
    this.scriptHost.attachScene(resolved);
  }

  getScene(): SceneData | undefined {
    return this.sceneHost.getScene();
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
    if (this.disposed) {
      return;
    }
    this.scriptHost.clear();
    this.nodeEvents.clear();
    this.sceneHost.unload();
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
    this.sceneHost.writeTransform2D(nodeId, patch);
  }

  writeTransform3D(
    nodeId: string,
    patch: Parameters<NonNullable<ScriptRuntimeServices["setTransform3D"]>>[1],
  ): void {
    this.sceneHost.writeTransform3D(nodeId, patch);
  }

  writeModel3DPlayback(
    nodeId: string,
    patch: Parameters<
      NonNullable<ScriptRuntimeServices["setModel3DPlayback"]>
    >[1],
  ): void {
    this.sceneHost.writeModel3DPlayback(nodeId, patch);
  }

  writeText(nodeId: string, text: string): void {
    this.sceneHost.writeText(nodeId, text);
  }

  writeSpriteAssetId(nodeId: string, assetId: string): void {
    this.sceneHost.writeSpriteAssetId(nodeId, assetId);
  }

  writeAnimatedSpritePlayback(
    nodeId: string,
    patch: Parameters<
      NonNullable<ScriptRuntimeServices["setAnimatedSpritePlayback"]>
    >[1],
  ): void {
    this.sceneHost.writeAnimatedSpritePlayback(nodeId, patch);
  }

  reparentLiveNode(
    nodeId: string,
    parentId: string | undefined,
    index?: number,
  ): void {
    this.sceneHost.reparentLiveNode(nodeId, parentId, index);
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
          scale: { ...IDENTITY_SCALE_3D },
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
    return this.sceneHost.spawnModel3DNode(options);
  }

  cloneNamedNode(
    sourceName: string,
    index: number,
    columns?: number,
  ): string | undefined {
    return this.sceneHost.cloneNamedNode(sourceName, index, columns);
  }

  setNodeVisible(nodeId: string, visible: boolean): void {
    this.sceneHost.setNodeVisible(nodeId, visible);
  }

  setNodeAlpha(nodeId: string, alpha: number): void {
    this.sceneHost.setNodeAlpha(nodeId, alpha);
  }

  setNodeState(nodeId: string, stateIdOrName: string | null): void {
    this.sceneHost.setNodeState(nodeId, stateIdOrName);
  }

  getNodeState(nodeId: string): string | null {
    return this.sceneHost.getNodeState(nodeId);
  }

  setNodeCursor(nodeId: string, cursor: string): void {
    this.sceneHost.setNodeCursor(nodeId, cursor);
  }

  destroySpawnedNode(nodeId: string): void {
    this.sceneHost.destroySpawnedNode(nodeId);
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
    return resolveSceneRuntimeTransform2D(
      this.getScene(),
      nodeId,
      this.sceneIndex,
    );
  }

  private resolveNodeTransform3D(nodeId: string): RuntimeTransform3D | undefined {
    for (const registration of this.rendererHost.getOrdered()) {
      const live = registration.renderer.getRuntimeTransform3D?.(nodeId);
      if (live) {
        return live;
      }
    }
    return undefined;
  }

  private refreshPerformanceStats(): void {
    this.performanceStats = buildPerformanceStats({
      frameDt: this.lastFrameDt,
      gameLogicMs: this.lastTickMs,
      renderPassMs: this.lastRenderPassMs,
      renderStats: sampleRendererStats(this.rendererHost.getOrdered()),
    });
  }
}
