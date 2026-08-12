import type { AssetResolver } from "@game-editor/assets";
import { PixiSceneRenderer } from "@game-editor/renderer-pixi";
import type { SceneData } from "@game-editor/scene";
import { GameRuntime } from "@game-editor/runtime";

export interface GamePreviewStartOptions {
  canvasParent: HTMLElement;
  scene: SceneData;
  assetResolver: AssetResolver;
}

/**
 * Owns an isolated Pixi + GameRuntime preview session.
 * Never attaches to EditorViewportController.
 */
export class GamePreviewSession {
  private renderer: PixiSceneRenderer | undefined;
  private runtime: GameRuntime | undefined;
  private startToken = 0;

  get isRunning(): boolean {
    return this.renderer !== undefined;
  }

  async start(options: GamePreviewStartOptions): Promise<void> {
    const token = ++this.startToken;
    await this.disposeInternal();

    const renderer = new PixiSceneRenderer({
      canvasParent: options.canvasParent,
      assetResolver: options.assetResolver,
      editable: false,
    });
    await renderer.whenReady();
    if (token !== this.startToken) {
      await renderer.destroy();
      return;
    }

    const runtime = new GameRuntime();
    runtime.registerRenderer({
      kind: "pixi",
      renderer,
      layer: { id: "main", renderer: "pixi", order: 0 },
    });
    runtime.loadScene(options.scene);

    const width = Math.max(options.canvasParent.clientWidth, 1);
    const height = Math.max(options.canvasParent.clientHeight, 1);
    runtime.resize(width, height);
    runtime.render();

    if (token !== this.startToken) {
      await renderer.destroy();
      return;
    }

    this.renderer = renderer;
    this.runtime = runtime;
  }

  async stop(): Promise<void> {
    this.startToken += 1;
    await this.disposeInternal();
  }

  private async disposeInternal(): Promise<void> {
    const renderer = this.renderer;
    this.renderer = undefined;
    this.runtime = undefined;
    if (renderer) {
      await renderer.destroy();
    }
  }
}
