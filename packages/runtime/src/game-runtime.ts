import { EventBus, type RendererKind, type RenderLayer } from "@game-editor/core";
import type {
  ComponentRegistry,
  NodePointerEventName,
  ScriptPerformanceStats,
  ScriptRuntimeServices,
  ScriptTransform2D,
  ScriptTransform2DPatch,
} from "@game-editor/game-components";
import {
  findNodeById,
  flattenNodes,
  getBitmapText,
  getHTMLText,
  getText,
  getTransform2D,
  type SceneData,
  type SceneRenderStats,
  type SceneRenderer,
} from "@game-editor/scene";
import { ScriptHost } from "./script-host.js";

const MS_PER_SECOND = 1000;
const EMPTY_RENDER_STATS: SceneRenderStats = {
  drawCalls: 0,
  triangles: 0,
  canvas: 0,
  displayObjects: 0,
};

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
}

/**
 * Minimal game runtime shell. Does not depend on editor packages.
 * Renderers are registered explicitly so Three.js stays optional per game.
 */
export class GameRuntime {
  private readonly renderers = new Map<RendererKind, RuntimeRendererRegistration>();
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
    const externalSetText = options.services?.setText;
    const externalGetPerformanceStats = options.services?.getPerformanceStats;
    const externalResolveAssetUrl = options.services?.resolveAssetUrl;
    const externalPlayAudio = options.services?.playAudio;
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
      playAudio: externalPlayAudio,
      getTransform2D: (nodeId) => {
        if (externalGetTransform2D) {
          return externalGetTransform2D(nodeId);
        }
        return this.readTransform2D(nodeId);
      },
      setTransform2D: (nodeId, patch) => {
        if (externalSetTransform2D) {
          externalSetTransform2D(nodeId, patch);
          return;
        }
        this.writeTransform2D(nodeId, patch);
      },
      setText: (nodeId, text) => {
        if (externalSetText) {
          externalSetText(nodeId, text);
          return;
        }
        this.writeText(nodeId, text);
      },
      getPerformanceStats: () => {
        if (externalGetPerformanceStats) {
          return externalGetPerformanceStats();
        }
        return this.performanceStats;
      },
    };
    this.scriptHost = new ScriptHost(options.components, services);
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
   * Also fans `pointertap` into legacy `onNodeClick` subscribers.
   */
  emitNodePointerEvent(nodeId: string, event: NodePointerEventName): void {
    const set = this.nodePointerHandlers.get(
      pointerSubscriptionKey(nodeId, event),
    );
    if (set) {
      for (const handler of [...set]) {
        handler();
      }
    }
    if (event === "pointertap") {
      this.emitNodeClick(nodeId);
    }
  }

  /** Replace scene-navigation handler (preview / game bootstrap). */
  setChangeSceneHandler(
    handler: ((sceneId: string) => void | Promise<void>) | undefined,
  ): void {
    this.changeSceneHandler = handler;
  }

  registerRenderer(registration: RuntimeRendererRegistration): void {
    this.renderers.set(registration.kind, registration);
  }

  loadScene(scene: SceneData): void {
    this.scene = scene;
    const nodes = flattenNodes(scene);
    for (const registration of this.renderers.values()) {
      registration.renderer.clear();
      for (const node of nodes) {
        registration.renderer.createNode(node);
      }
    }
    this.scriptHost.attachScene(scene);
  }

  getScene(): SceneData | undefined {
    return this.scene;
  }

  /** Number of live script instances attached after the last loadScene. */
  getScriptInstanceCount(): number {
    return this.scriptHost.getInstanceCount();
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
    return [...this.renderers.keys()];
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
      drawCalls: renderStats.drawCalls,
      triangles: renderStats.triangles,
      gameLogicMs,
      rendererMs,
      canvas: renderStats.canvas,
      displayObjects: renderStats.displayObjects,
    };
  }

  private sampleRendererStats(): SceneRenderStats {
    let merged: SceneRenderStats = { ...EMPTY_RENDER_STATS };
    for (const registration of this.renderers.values()) {
      const sample = registration.renderer.getRenderStats?.();
      if (!sample) {
        continue;
      }
      merged = {
        drawCalls: merged.drawCalls + sample.drawCalls,
        triangles: merged.triangles + sample.triangles,
        canvas: merged.canvas + sample.canvas,
        displayObjects: merged.displayObjects + sample.displayObjects,
      };
    }
    return merged;
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

  private readTransform2D(nodeId: string): ScriptTransform2D | undefined {
    const scene = this.scene;
    if (!scene) {
      return undefined;
    }
    const node = findNodeById(scene, nodeId);
    const transform = node ? getTransform2D(node) : undefined;
    if (!transform) {
      return undefined;
    }
    return {
      position: { ...transform.position },
      rotation: transform.rotation,
      scale: { ...transform.scale },
    };
  }

  private writeTransform2D(
    nodeId: string,
    patch: ScriptTransform2DPatch,
  ): void {
    const scene = this.scene;
    if (!scene) {
      return;
    }
    const node = findNodeById(scene, nodeId);
    const transform = node ? getTransform2D(node) : undefined;
    if (!node || !transform) {
      return;
    }
    if (patch.position) {
      transform.position = { ...patch.position };
    }
    if (patch.rotation !== undefined) {
      transform.rotation = patch.rotation;
    }
    if (patch.scale) {
      transform.scale = { ...patch.scale };
    }
    for (const registration of this.renderers.values()) {
      registration.renderer.syncTransform(node);
    }
  }

  private writeText(nodeId: string, text: string): void {
    const scene = this.scene;
    if (!scene) {
      return;
    }
    const node = findNodeById(scene, nodeId);
    if (!node) {
      return;
    }
    const textComp = getText(node) ?? getHTMLText(node) ?? getBitmapText(node);
    if (!textComp) {
      return;
    }
    textComp.text = text;
    for (const registration of this.renderers.values()) {
      registration.renderer.updateNode(node);
    }
  }
}
