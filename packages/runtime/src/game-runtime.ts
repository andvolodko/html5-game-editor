import { EventBus, type RendererKind, type RenderLayer } from "@game-editor/core";
import type {
  ComponentRegistry,
  NodePointerEventName,
  ScriptPerformanceStats,
  ScriptRuntimeServices,
} from "@game-editor/game-components";
import {
  addSceneRenderStats,
  canMoveNode,
  EMPTY_SCENE_RENDER_STATS,
  flattenNodes,
  flattenSubtree,
  findNodeById,
  moveNodeInScene,
  resolveScenePrefabs,
  type PrefabCatalog,
  type SceneData,
  type SceneNodeData,
  type SceneRenderStats,
  type SceneRenderer,
} from "@game-editor/scene";
import { ScriptHost } from "./script-host.js";
import {
  patchModel3DPlayback,
  patchNodeText,
  patchSpriteAssetId,
  patchTransform2D,
  patchTransform3D,
  readModel3DPlayback,
  readTransform2D,
  readTransform3D,
} from "./script-scene-io.js";
import { destroyNodeInScene, spawnModel3DInScene } from "./script-scene-spawn.js";
import { cloneNamedNodeInScene } from "./script-scene-clone.js";

const MS_PER_SECOND = 1000;

function pointerSubscriptionKey(
  nodeId: string,
  event: NodePointerEventName,
): string {
  return `${nodeId}\0${event}`;
}

export interface RuntimeRendererRegistration {
  kind: RendererKind;
  renderer: SceneRenderer;
  layer: RenderLayer;
  /** When set, only matching nodes are synced to this renderer. */
  accepts?: (node: SceneNodeData) => boolean;
}

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
export class GameRuntime {
  private readonly renderers = new Map<string, RuntimeRendererRegistration>();
  private scene: SceneData | undefined;
  private readonly scriptHost: ScriptHost;
  private readonly bus: EventBus;
  private readonly nodeClickHandlers = new Map<string, Set<() => void>>();
  private readonly nodePointerHandlers = new Map<string, Set<() => void>>();
  private changeSceneHandler:
    | ((sceneId: string) => void | Promise<void>)
    | undefined;
  private lastTickMs = 0;
  private lastRenderPassMs = 0;
  private lastFrameDt = 0;
  private readonly spawnedNodeIds = new Set<string>();
  private prefabs: PrefabCatalog;
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
    const externalOnNodeClick = options.services?.onNodeClick;
    const externalOnNodePointerEvent = options.services?.onNodePointerEvent;
    const externalGetTransform2D = options.services?.getTransform2D;
    const externalSetTransform2D = options.services?.setTransform2D;
    const externalGetTransform3D = options.services?.getTransform3D;
    const externalSetTransform3D = options.services?.setTransform3D;
    const externalGetModel3DPlayback = options.services?.getModel3DPlayback;
    const externalSetModel3DPlayback = options.services?.setModel3DPlayback;
    const externalListModel3DAnimations = options.services?.listModel3DAnimations;
    const externalGetModel3DAnimationDuration =
      options.services?.getModel3DAnimationDuration;
    const externalSetText = options.services?.setText;
    const externalSetSpriteAssetId = options.services?.setSpriteAssetId;
    const externalReparentNode = options.services?.reparentNode;
    const externalGetPerformanceStats = options.services?.getPerformanceStats;
    const externalResolveAssetUrl = options.services?.resolveAssetUrl;
    const externalListAllSceneAssetIds = options.services?.listAllSceneAssetIds;
    const externalPreloadSceneAsset = options.services?.preloadSceneAsset;
    const externalPlayAudio = options.services?.playAudio;
    const externalStopAudio = options.services?.stopAudio;
    const externalSetAudioEnabled = options.services?.setAudioEnabled;
    const externalSpawnModel3D = options.services?.spawnModel3D;
    const externalDestroyNode = options.services?.destroyNode;
    const externalCloneNodeByName = options.services?.cloneNodeByName;
    const externalListChildNodes = options.services?.listChildNodes;
    const externalSetNodeVisible = options.services?.setNodeVisible;
    const externalSetNodeAlpha = options.services?.setNodeAlpha;
    const externalSetNodeCursor = options.services?.setNodeCursor;
    const externalGetModel3DBoneWorldTransform =
      options.services?.getModel3DBoneWorldTransform;
    const services: ScriptRuntimeServices = {
      bus: this.bus,
      changeScene: (sceneId) => {
        const handler = this.changeSceneHandler;
        if (!handler) {
          return;
        }
        return handler(sceneId);
      },
      onNodeClick: (nodeId, handler) => {
        if (externalOnNodeClick) {
          return externalOnNodeClick(nodeId, handler);
        }
        return this.subscribeNodeClick(nodeId, handler);
      },
      onNodePointerEvent: (nodeId, event, handler) => {
        if (externalOnNodePointerEvent) {
          return externalOnNodePointerEvent(nodeId, event, handler);
        }
        return this.subscribeNodePointerEvent(nodeId, event, handler);
      },
      resolveAssetUrl: externalResolveAssetUrl,
      listAllSceneAssetIds: externalListAllSceneAssetIds,
      preloadSceneAsset: externalPreloadSceneAsset,
      playAudio: externalPlayAudio,
      stopAudio: externalStopAudio,
      setAudioEnabled: externalSetAudioEnabled,
      getTransform2D: (nodeId) => {
        if (externalGetTransform2D) {
          return externalGetTransform2D(nodeId);
        }
        return readTransform2D(this.scene, nodeId);
      },
      setTransform2D: (nodeId, patch) => {
        if (externalSetTransform2D) {
          externalSetTransform2D(nodeId, patch);
          return;
        }
        this.writeTransform2D(nodeId, patch);
      },
      getTransform3D: (nodeId) => {
        if (externalGetTransform3D) {
          return externalGetTransform3D(nodeId);
        }
        return readTransform3D(this.scene, nodeId);
      },
      setTransform3D: (nodeId, patch) => {
        if (externalSetTransform3D) {
          externalSetTransform3D(nodeId, patch);
          return;
        }
        this.writeTransform3D(nodeId, patch);
      },
      getModel3DPlayback: (nodeId) => {
        if (externalGetModel3DPlayback) {
          return externalGetModel3DPlayback(nodeId);
        }
        return readModel3DPlayback(this.scene, nodeId);
      },
      setModel3DPlayback: (nodeId, patch) => {
        if (externalSetModel3DPlayback) {
          externalSetModel3DPlayback(nodeId, patch);
          return;
        }
        this.writeModel3DPlayback(nodeId, patch);
      },
      listModel3DAnimations: (nodeId) => {
        return externalListModel3DAnimations?.(nodeId) ?? [];
      },
      getModel3DAnimationDuration: (nodeId, animation) => {
        return externalGetModel3DAnimationDuration?.(nodeId, animation);
      },
      getModel3DBoneWorldTransform: (nodeId, boneName) => {
        if (externalGetModel3DBoneWorldTransform) {
          return externalGetModel3DBoneWorldTransform(nodeId, boneName);
        }
        return this.readBoneWorldTransform(nodeId, boneName);
      },
      setText: (nodeId, text) => {
        if (externalSetText) {
          externalSetText(nodeId, text);
          return;
        }
        this.writeText(nodeId, text);
      },
      setSpriteAssetId: (nodeId, assetId) => {
        if (externalSetSpriteAssetId) {
          externalSetSpriteAssetId(nodeId, assetId);
          return;
        }
        this.writeSpriteAssetId(nodeId, assetId);
      },
      reparentNode: (nodeId, parentId, index) => {
        if (externalReparentNode) {
          externalReparentNode(nodeId, parentId, index);
          return;
        }
        this.reparentLiveNode(nodeId, parentId, index);
      },
      getPerformanceStats: () => {
        if (externalGetPerformanceStats) {
          return externalGetPerformanceStats();
        }
        return this.performanceStats;
      },
      spawnModel3D: (spawnOptions) => {
        if (externalSpawnModel3D) {
          return externalSpawnModel3D(spawnOptions);
        }
        return this.spawnModel3DNode(spawnOptions);
      },
      cloneNodeByName: (sourceName, index, columns) => {
        if (externalCloneNodeByName) {
          return externalCloneNodeByName(sourceName, index, columns);
        }
        return this.cloneNamedNode(sourceName, index, columns);
      },
      destroyNode: (nodeId) => {
        if (externalDestroyNode) {
          externalDestroyNode(nodeId);
          return;
        }
        this.destroySpawnedNode(nodeId);
      },
      listChildNodes: (nodeId) => {
        if (externalListChildNodes) {
          return externalListChildNodes(nodeId);
        }
        return this.listChildNodes(nodeId);
      },
      setNodeVisible: (nodeId, visible) => {
        if (externalSetNodeVisible) {
          externalSetNodeVisible(nodeId, visible);
          return;
        }
        this.setNodeVisible(nodeId, visible);
      },
      setNodeAlpha: (nodeId, alpha) => {
        if (externalSetNodeAlpha) {
          externalSetNodeAlpha(nodeId, alpha);
          return;
        }
        this.setNodeAlpha(nodeId, alpha);
      },
      setNodeCursor: (nodeId, cursor) => {
        if (externalSetNodeCursor) {
          externalSetNodeCursor(nodeId, cursor);
          return;
        }
        this.setNodeCursor(nodeId, cursor);
      },
    };
    this.scriptHost = new ScriptHost(options.components, services);
    this.prefabs = options.prefabs ?? new Map();
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
    const set = this.nodeClickHandlers.get(nodeId);
    if (!set) {
      return;
    }
    for (const handler of [...set]) {
      handler();
    }
  }

  /**
   * Forward a renderer pointer event to scripts subscribed via `onNodePointerEvent`.
   * Walks ancestors so a Button on a parent still receives child visual hits.
   * Also fans `pointertap` into legacy `onNodeClick` subscribers.
   */
  emitNodePointerEvent(nodeId: string, event: NodePointerEventName): void {
    let current: string | undefined = nodeId;
    const visited = new Set<string>();
    while (current !== undefined && !visited.has(current)) {
      visited.add(current);
      const set = this.nodePointerHandlers.get(
        pointerSubscriptionKey(current, event),
      );
      if (set) {
        for (const handler of [...set]) {
          handler();
        }
      }
      if (event === "pointertap") {
        this.emitNodeClick(current);
      }
      current = this.scene
        ? findNodeById(this.scene, current)?.parentId
        : undefined;
    }
  }

  /** Replace scene-navigation handler (preview / game bootstrap). */
  setChangeSceneHandler(
    handler: ((sceneId: string) => void | Promise<void>) | undefined,
  ): void {
    this.changeSceneHandler = handler;
  }

  registerRenderer(registration: RuntimeRendererRegistration): void {
    this.renderers.set(registration.layer.id, registration);
  }

  /** Drop renderer registrations. Call after destroying the previous stack. */
  clearRenderers(): void {
    this.renderers.clear();
  }

  loadScene(scene: SceneData): void {
    this.spawnedNodeIds.clear();
    const { scene: resolved, warnings } = resolveScenePrefabs(scene, this.prefabs);
    for (const warning of warnings) {
      console.warn(`[prefab] ${warning.message}`);
    }
    this.scene = resolved;
    const nodes = flattenNodes(resolved);
    for (const registration of this.renderers.values()) {
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

  /** Tear down live scripts (stops looping audio, unsubscribes bus handlers). */
  dispose(): void {
    this.scriptHost.clear();
  }

  /**
   * Optional per-frame hook for script `update`. Not driven automatically in v1.
   */
  tick(dt: number): void {
    this.lastFrameDt = Math.max(0, dt);
    const startedMs = performance.now();
    this.scriptHost.tick(dt);
    this.lastTickMs = performance.now() - startedMs;
  }

  resize(width: number, height: number): void {
    for (const registration of this.renderers.values()) {
      registration.renderer.resize(width, height);
    }
  }

  render(): void {
    const startedMs = performance.now();
    const ordered = [...this.renderers.values()].sort(
      (a, b) => a.layer.order - b.layer.order,
    );
    for (const registration of ordered) {
      registration.renderer.render();
    }
    this.lastRenderPassMs = performance.now() - startedMs;
    this.refreshPerformanceStats();
  }

  getRegisteredRenderers(): RendererKind[] {
    return [...new Set([...this.renderers.values()].map((r) => r.kind))];
  }

  /** Latest frame metrics (also exposed via script `getPerformanceStats`). */
  getPerformanceStats(): Readonly<ScriptPerformanceStats> {
    return this.performanceStats;
  }

  private refreshPerformanceStats(): void {
    const frameTimeMs = this.lastFrameDt * MS_PER_SECOND;
    const fps = frameTimeMs > 0 ? MS_PER_SECOND / frameTimeMs : 0;
    const renderStats = this.sampleRendererStats();
    const gameLogicMs = this.lastTickMs;
    const rendererMs =
      this.lastRenderPassMs > 0
        ? this.lastRenderPassMs
        : Math.max(0, frameTimeMs - gameLogicMs);
    this.performanceStats = {
      frameTimeMs,
      fps,
      drawCalls: renderStats.merged.drawCalls,
      triangles: renderStats.merged.triangles,
      gameLogicMs,
      rendererMs,
      canvas: renderStats.merged.canvas,
      displayObjects: renderStats.merged.displayObjects,
      pixi: renderStats.pixi,
      three: renderStats.three,
    };
  }

  private sampleRendererStats(): {
    merged: SceneRenderStats;
    pixi?: SceneRenderStats;
    three?: SceneRenderStats;
  } {
    let merged = EMPTY_SCENE_RENDER_STATS;
    let pixi: SceneRenderStats | undefined;
    let three: SceneRenderStats | undefined;
    for (const registration of this.renderers.values()) {
      const sample = registration.renderer.getRenderStats?.();
      if (!sample) {
        continue;
      }
      merged = addSceneRenderStats(merged, sample);
      if (registration.kind === "pixi") {
        pixi = pixi ? addSceneRenderStats(pixi, sample) : sample;
      } else if (registration.kind === "three") {
        three = three ? addSceneRenderStats(three, sample) : sample;
      }
    }
    return { merged, pixi, three };
  }

  private subscribeNodeClick(
    nodeId: string,
    handler: () => void,
  ): () => void {
    let set = this.nodeClickHandlers.get(nodeId);
    if (!set) {
      set = new Set();
      this.nodeClickHandlers.set(nodeId, set);
    }
    set.add(handler);
    return () => {
      set?.delete(handler);
      if (set && set.size === 0) {
        this.nodeClickHandlers.delete(nodeId);
      }
    };
  }

  private subscribeNodePointerEvent(
    nodeId: string,
    event: NodePointerEventName,
    handler: () => void,
  ): () => void {
    const key = pointerSubscriptionKey(nodeId, event);
    let set = this.nodePointerHandlers.get(key);
    if (!set) {
      set = new Set();
      this.nodePointerHandlers.set(key, set);
    }
    set.add(handler);
    return () => {
      set?.delete(handler);
      if (set && set.size === 0) {
        this.nodePointerHandlers.delete(key);
      }
    };
  }

  private writeTransform2D(
    nodeId: string,
    patch: Parameters<NonNullable<ScriptRuntimeServices["setTransform2D"]>>[1],
  ): void {
    const node = patchTransform2D(this.scene, nodeId, patch);
    if (!node) {
      return;
    }
    this.forOwningRenderers(node, (renderer) => {
      renderer.syncTransform(node);
    });
  }

  private writeTransform3D(
    nodeId: string,
    patch: Parameters<NonNullable<ScriptRuntimeServices["setTransform3D"]>>[1],
  ): void {
    const node = patchTransform3D(this.scene, nodeId, patch);
    if (!node) {
      return;
    }
    this.forOwningRenderers(node, (renderer) => {
      renderer.syncTransform(node);
    });
  }

  private writeModel3DPlayback(
    nodeId: string,
    patch: Parameters<
      NonNullable<ScriptRuntimeServices["setModel3DPlayback"]>
    >[1],
  ): void {
    const node = patchModel3DPlayback(this.scene, nodeId, patch);
    if (!node) {
      return;
    }
    this.forOwningRenderers(node, (renderer) => {
      renderer.updateNode(node);
    });
  }

  private writeText(nodeId: string, text: string): void {
    const node = patchNodeText(this.scene, nodeId, text);
    if (!node) {
      return;
    }
    this.forOwningRenderers(node, (renderer) => {
      renderer.updateNode(node);
    });
  }

  private writeSpriteAssetId(nodeId: string, assetId: string): void {
    const node = patchSpriteAssetId(this.scene, nodeId, assetId);
    if (!node) {
      return;
    }
    this.forOwningRenderers(node, (renderer) => {
      renderer.updateNode(node);
    });
  }

  private reparentLiveNode(
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
        : findNodeById(this.scene, parentId)?.children;
    if (!siblings) {
      return;
    }
    const insertIndex =
      index === undefined
        ? siblings.length
        : Math.max(0, Math.min(Math.floor(index), siblings.length));
    const moved = moveNodeInScene(this.scene, nodeId, parentId, insertIndex);
    this.forOwningRenderers(moved.node, (renderer) => {
      renderer.reparentNode(nodeId, parentId, moved.toIndex);
    });
  }

  private readBoneWorldTransform(
    nodeId: string,
    boneName: string,
  ): ReturnType<
    NonNullable<ScriptRuntimeServices["getModel3DBoneWorldTransform"]>
  > {
    for (const registration of this.renderers.values()) {
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

  private spawnModel3DNode(
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
    this.forAcceptingRenderers(node, (renderer) => {
      renderer.createNode(node);
    });
    return node.id;
  }

  private cloneNamedNode(
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
    for (const created of flattenSubtree(node)) {
      this.spawnedNodeIds.add(created.id);
      this.forAcceptingRenderers(created, (renderer) => {
        renderer.createNode(created);
      });
    }
    return node.id;
  }

  private listChildNodes(
    nodeId: string,
  ): ReadonlyArray<{ id: string; name: string }> {
    const node = this.scene ? findNodeById(this.scene, nodeId) : undefined;
    if (!node) {
      return [];
    }
    return node.children.map((child) => ({ id: child.id, name: child.name }));
  }

  private setNodeVisible(nodeId: string, visible: boolean): void {
    for (const registration of this.renderers.values()) {
      registration.renderer.setNodeVisible?.(nodeId, visible);
    }
  }

  private setNodeAlpha(nodeId: string, alpha: number): void {
    for (const registration of this.renderers.values()) {
      registration.renderer.setNodeAlpha?.(nodeId, alpha);
    }
  }

  private setNodeCursor(nodeId: string, cursor: string): void {
    for (const registration of this.renderers.values()) {
      registration.renderer.setNodeCursor?.(nodeId, cursor);
    }
  }

  private destroySpawnedNode(nodeId: string): void {
    if (!this.scene || !this.spawnedNodeIds.has(nodeId)) {
      return;
    }
    const removed = destroyNodeInScene(this.scene, nodeId);
    for (const node of removed) {
      this.spawnedNodeIds.delete(node.id);
      for (const registration of this.renderers.values()) {
        registration.renderer.destroyNode(node.id);
      }
    }
  }

  private forAcceptingRenderers(
    node: SceneNodeData,
    fn: (renderer: SceneRenderer) => void,
  ): void {
    for (const registration of this.renderers.values()) {
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
    for (const registration of this.renderers.values()) {
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
