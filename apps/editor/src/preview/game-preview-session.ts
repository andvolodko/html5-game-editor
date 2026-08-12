import type { AssetResolver } from "@game-editor/assets";
import { EventBus } from "@game-editor/core";
import type { ProjectResolution } from "@game-editor/editor-core";
import {
  ComponentRegistry,
  installSceneFlowRuntime,
  type ComponentDefinition,
} from "@game-editor/game-components";
import { PixiSceneRenderer } from "@game-editor/renderer-pixi";
import type { SceneData } from "@game-editor/scene";
import { GameRuntime, GameScreenHost } from "@game-editor/runtime";
import { installActiveGameRuntime } from "../components/install-active-game-runtime";

export interface GamePreviewStartOptions {
  canvasParent: HTMLElement;
  scene: SceneData;
  assetResolver: AssetResolver;
  /** Design resolution from project.json — drives letterboxing + buffer size. */
  resolution: ProjectResolution;
  /** Session script catalog from the open project (optional). */
  components?: ComponentRegistry;
  /** Active game id — used to restore game-local script `create` factories. */
  projectId?: string | null;
  /** Load a scene by file id for Change Scene / Loading Scene scripts. */
  loadSceneById?: (sceneId: string) => Promise<SceneData>;
}

/**
 * Owns an isolated Pixi + GameRuntime preview session.
 * Never attaches to EditorViewportController.
 */
export class GamePreviewSession {
  private screen: GameScreenHost | undefined;
  private renderer: PixiSceneRenderer | undefined;
  private runtime: GameRuntime | undefined;
  private bus: EventBus | undefined;
  private startToken = 0;
  private rafId = 0;
  private lastFrameMs = 0;

  get isRunning(): boolean {
    return this.renderer !== undefined;
  }

  /** Preview-session event bus (available while running). */
  getBus(): EventBus | undefined {
    return this.bus;
  }

  async start(options: GamePreviewStartOptions): Promise<void> {
    const token = ++this.startToken;
    await this.disposeInternal();

    const screen = new GameScreenHost(options.canvasParent, options.resolution);
    const design = screen.getResolution();

    const renderer = new PixiSceneRenderer({
      canvasParent: screen.frame,
      assetResolver: options.assetResolver,
      editable: false,
      designResolution: design,
    });
    await renderer.whenReady();
    if (token !== this.startToken) {
      await renderer.destroy();
      screen.destroy();
      return;
    }

    const bus = new EventBus();
    const components = cloneComponentRegistry(options.components);
    installSceneFlowRuntime(components);
    await installActiveGameRuntime(options.projectId, components);

    if (token !== this.startToken) {
      await renderer.destroy();
      screen.destroy();
      return;
    }

    const runtime = new GameRuntime({
      components,
      services: {
        bus,
        changeScene: async (sceneId) => {
          if (!options.loadSceneById) {
            return;
          }
          const next = await options.loadSceneById(sceneId);
          if (token !== this.startToken) {
            return;
          }
          runtime.loadScene(next);
          runtime.resize(design.width, design.height);
          runtime.render();
        },
      },
    });
    runtime.registerRenderer({
      kind: "pixi",
      renderer,
      layer: { id: "main", renderer: "pixi", order: 0 },
    });
    renderer.setPointerHandlers({
      onNodeClick: (nodeId) => runtime.emitNodeClick(nodeId),
    });
    runtime.loadScene(options.scene);
    runtime.resize(design.width, design.height);
    runtime.render();

    if (token !== this.startToken) {
      await renderer.destroy();
      screen.destroy();
      return;
    }

    this.screen = screen;
    this.renderer = renderer;
    this.runtime = runtime;
    this.bus = bus;
    this.lastFrameMs = performance.now();
    this.scheduleFrame(token);
  }

  async stop(): Promise<void> {
    this.startToken += 1;
    await this.disposeInternal();
  }

  private scheduleFrame(token: number): void {
    this.rafId = requestAnimationFrame((nowMs) => {
      if (token !== this.startToken) {
        return;
      }
      const runtime = this.runtime;
      if (!runtime) {
        return;
      }
      const MS_PER_SECOND = 1000;
      const dt = Math.max(0, (nowMs - this.lastFrameMs) / MS_PER_SECOND);
      this.lastFrameMs = nowMs;
      runtime.tick(dt);
      runtime.render();
      this.scheduleFrame(token);
    });
  }

  private async disposeInternal(): Promise<void> {
    if (this.rafId !== 0) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.bus?.clear();
    this.bus = undefined;
    const renderer = this.renderer;
    this.renderer = undefined;
    this.runtime = undefined;
    if (renderer) {
      await renderer.destroy();
    }
    this.screen?.destroy();
    this.screen = undefined;
  }
}

function cloneComponentRegistry(
  source: ComponentRegistry | undefined,
): ComponentRegistry {
  const next = new ComponentRegistry();
  if (!source) {
    return next;
  }
  for (const def of source.list()) {
    const clone: ComponentDefinition = {
      id: def.id,
      displayName: def.displayName,
      category: def.category,
      categoryOrder: def.categoryOrder,
      order: def.order,
      properties: structuredClone(def.properties),
      ...(def.allowMultiple !== undefined
        ? { allowMultiple: def.allowMultiple }
        : {}),
      ...(def.create ? { create: def.create } : {}),
    };
    next.register(clone);
  }
  return next;
}
