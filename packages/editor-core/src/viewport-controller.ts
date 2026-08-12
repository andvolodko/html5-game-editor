import {
  findNodeById,
  flattenNodes,
  flattenSubtree,
  getSceneRendererKind,
  type SceneRenderer,
  type SceneRendererKind,
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
  private lastRendererKind: SceneRendererKind | undefined;
  private readonly remountListeners = new Set<
    (kind: SceneRendererKind) => void
  >();

  constructor(private readonly document: DocumentManager) {
    this.lastRendererKind = getSceneRendererKind(document.getScene());
  }

  attach(renderer: SceneRenderer): void {
    this.detach();
    this.renderer = renderer;
    this.lastRendererKind = getSceneRendererKind(this.document.getScene());
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

  /**
   * Fired when scene.renderer kind changes and the viewport stack must remount.
   */
  subscribeRendererKindRemount(
    listener: (kind: SceneRendererKind) => void,
  ): () => void {
    this.remountListeners.add(listener);
    return () => {
      this.remountListeners.delete(listener);
    };
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
      if (mutation.kind === "scene-meta") {
        this.notifyRendererKindIfChanged();
      }
      return;
    }

    switch (mutation.kind) {
      case "create": {
        this.createSubtree(mutation.nodeId);
        break;
      }
      case "update": {
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
        const kind = getSceneRendererKind(this.document.getScene());
        if (this.lastRendererKind !== kind) {
          this.lastRendererKind = kind;
          for (const listener of this.remountListeners) {
            listener(kind);
          }
          return;
        }
        this.rebuild();
        return;
      }
      case "scene-meta": {
        const before = this.lastRendererKind;
        this.notifyRendererKindIfChanged();
        if (before !== this.lastRendererKind) {
          return;
        }
        break;
      }
    }

    this.renderer.render();
  }

  private notifyRendererKindIfChanged(): void {
    const kind = getSceneRendererKind(this.document.getScene());
    if (this.lastRendererKind === kind) {
      return;
    }
    this.lastRendererKind = kind;
    for (const listener of this.remountListeners) {
      listener(kind);
    }
  }
}
