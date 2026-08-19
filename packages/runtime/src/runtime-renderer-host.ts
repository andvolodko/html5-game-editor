import type { RendererKind, RenderLayer } from "@game-editor/core";
import type { SceneNodeData, SceneRenderer } from "@game-editor/scene";

export interface RuntimeRendererRegistration {
  kind: RendererKind;
  renderer: SceneRenderer;
  layer: RenderLayer;
  /** When set, only matching nodes are synced to this renderer. */
  accepts?: (node: SceneNodeData) => boolean;
}

/**
 * Renderer registrations plus a cached order used by the render loop.
 * Rebuilds the ordered list only when a renderer is added or removed.
 */
export class RuntimeRendererHost {
  private readonly renderers = new Map<string, RuntimeRendererRegistration>();
  private ordered: RuntimeRendererRegistration[] = [];

  register(registration: RuntimeRendererRegistration): void {
    this.renderers.set(registration.layer.id, registration);
    this.rebuildOrdered();
  }

  clear(): void {
    this.renderers.clear();
    this.ordered = [];
  }

  get size(): number {
    return this.renderers.size;
  }

  getOrdered(): readonly RuntimeRendererRegistration[] {
    return this.ordered;
  }

  values(): IterableIterator<RuntimeRendererRegistration> {
    return this.renderers.values();
  }

  kinds(): RendererKind[] {
    const seen = new Set<RendererKind>();
    const result: RendererKind[] = [];
    for (const registration of this.ordered) {
      if (seen.has(registration.kind)) {
        continue;
      }
      seen.add(registration.kind);
      result.push(registration.kind);
    }
    return result;
  }

  private rebuildOrdered(): void {
    this.ordered = [...this.renderers.values()].sort(
      (left, right) => left.layer.order - right.layer.order,
    );
  }
}
