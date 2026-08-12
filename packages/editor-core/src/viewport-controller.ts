import {
  findNodeById,
  flattenNodes,
  flattenSubtree,
  type SceneRenderer,
} from "@game-editor/scene";
import type { DocumentManager, SceneMutation } from "./document-manager.js";

/**
 * Keeps a SceneRenderer in sync with DocumentManager mutations.
 * Lives outside DocumentManager so presentation is not mixed into the document.
 * Normal edits use incremental ops; reload uses full rebuild.
 */
export class EditorViewportController {
  private renderer: SceneRenderer | undefined;
  private unsubscribe: (() => void) | undefined;
  private fullRebuildCount = 0;

  constructor(private readonly document: DocumentManager) {}

  attach(renderer: SceneRenderer): void {
    this.detach();
    this.renderer = renderer;
    this.unsubscribe = this.document.subscribe((event) => {
      if (event.kind === "state") {
        return;
      }
      this.applyMutation(event);
    });
    this.rebuild();
  }

  detach(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.renderer = undefined;
  }

  getRenderer(): SceneRenderer | undefined {
    return this.renderer;
  }

  /** Test/diagnostics: number of full clear+recreate passes since construct. */
  getFullRebuildCount(): number {
    return this.fullRebuildCount;
  }

  private rebuild(): void {
    if (!this.renderer) {
      return;
    }
    this.fullRebuildCount += 1;
    this.renderer.clear();
    for (const node of flattenNodes(this.document.getScene())) {
      this.renderer.createNode(node);
    }
    this.renderer.render();
  }

  private createSubtree(nodeId: string): void {
    if (!this.renderer) {
      return;
    }
    const node = findNodeById(this.document.getScene(), nodeId);
    if (!node) {
      return;
    }
    for (const entry of flattenSubtree(node)) {
      this.renderer.createNode(entry);
    }
  }

  private applyMutation(mutation: SceneMutation): void {
    if (!this.renderer) {
      return;
    }

    switch (mutation.kind) {
      case "create": {
        this.createSubtree(mutation.nodeId);
        break;
      }
      case "update": {
        // Names and other metadata do not affect the renderer.
        if (mutation.reason === "metadata") {
          break;
        }
        const node = findNodeById(this.document.getScene(), mutation.nodeId);
        if (node) {
          this.renderer.updateNode(node);
        }
        break;
      }
      case "destroy": {
        this.renderer.destroyNode(mutation.nodeId);
        break;
      }
      case "move": {
        this.renderer.reparentNode(
          mutation.nodeId,
          mutation.parentId,
          mutation.index,
        );
        const node = findNodeById(this.document.getScene(), mutation.nodeId);
        if (node) {
          this.renderer.updateNode(node);
        }
        break;
      }
      case "reload": {
        this.rebuild();
        return;
      }
      case "scene-meta": {
        // Scene name / settings do not affect the renderer graph.
        break;
      }
    }

    this.renderer.render();
  }
}
