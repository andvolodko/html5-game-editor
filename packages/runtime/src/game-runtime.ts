import type { RendererKind, RenderLayer } from "@game-editor/core";
import type { SceneData, SceneRenderer } from "@game-editor/scene";

export interface RuntimeRendererRegistration {
  kind: RendererKind;
  renderer: SceneRenderer;
  layer: RenderLayer;
}

/**
 * Minimal game runtime shell. Does not depend on editor packages.
 * Renderers are registered explicitly so Three.js stays optional per game.
 */
export class GameRuntime {
  private readonly renderers = new Map<RendererKind, RuntimeRendererRegistration>();
  private scene: SceneData | undefined;

  registerRenderer(registration: RuntimeRendererRegistration): void {
    this.renderers.set(registration.kind, registration);
  }

  loadScene(scene: SceneData): void {
    this.scene = scene;
    for (const registration of this.renderers.values()) {
      for (const node of scene.nodes) {
        registration.renderer.createNode(node);
      }
    }
  }

  getScene(): SceneData | undefined {
    return this.scene;
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
}
