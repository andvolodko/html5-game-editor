import { EventBus, type RendererKind, type RenderLayer } from "@game-editor/core";
import type {
  ComponentRegistry,
  ScriptRuntimeServices,
  ScriptTransform2D,
  ScriptTransform2DPatch,
} from "@game-editor/game-components";
import {
  findNodeById,
  flattenNodes,
  getTransform2D,
  type SceneData,
  type SceneRenderer,
} from "@game-editor/scene";
import { ScriptHost } from "./script-host.js";

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
  private changeSceneHandler:
    | ((sceneId: string) => void | Promise<void>)
    | undefined;

  constructor(options: GameRuntimeOptions = {}) {
    this.bus = options.services?.bus ?? new EventBus();
    this.changeSceneHandler = options.services?.changeScene;
    const externalOnNodeClick = options.services?.onNodeClick;
    const externalGetTransform2D = options.services?.getTransform2D;
    const externalSetTransform2D = options.services?.setTransform2D;
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
    this.scriptHost.tick(dt);
  }

  resize(width: number, height: number): void {
    for (const registration of this.renderers.values()) {
      registration.renderer.resize(width, height);
    }
  }

  render(): void {
    const ordered = [...this.renderers.values()].sort(
      (a, b) => a.layer.order - b.layer.order,
    );
    for (const registration of ordered) {
      registration.renderer.render();
    }
  }

  getRegisteredRenderers(): RendererKind[] {
    return [...this.renderers.keys()];
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
}
