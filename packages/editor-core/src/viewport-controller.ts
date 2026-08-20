import {
  findNodeById,
  flattenNodes,
  flattenSubtree,
  getSceneRendererKind,
  nodeHasStateOverride,
  type NodeStateId,
  type SceneData,
  type SceneRenderer,
  type SceneRendererKind,
  BASE_NODE_STATE_ID,
} from "@game-editor/scene";
import type { DocumentManager, SceneMutation } from "./document-manager.js";
import { applyResolvedNodeStateDisplay } from "./apply-resolved-node-state-display.js";

export interface ViewportOverlaySync {
  sync(renderer: SceneRenderer, scene: SceneData): void;
}

export interface NodeStateDisplaySource {
  getActiveStateId(): NodeStateId | typeof BASE_NODE_STATE_ID;
}

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
  private readonly overlay: ViewportOverlaySync | undefined;
  private nodeStateSource: NodeStateDisplaySource | undefined;

  constructor(
    private readonly document: DocumentManager,
    overlay?: ViewportOverlaySync,
  ) {
    this.overlay = overlay;
    this.lastRendererKind = getSceneRendererKind(document.getScene());
  }

  setNodeStateDisplaySource(source: NodeStateDisplaySource | undefined): void {
    this.nodeStateSource = source;
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

  /**
   * Re-apply Base+active-state display for nodes affected by a session switch.
   * Does not rebuild the scene graph.
   */
  applyActiveNodeStateDisplay(
    previousStateId: NodeStateId | typeof BASE_NODE_STATE_ID,
  ): void {
    if (!this.renderer || !this.nodeStateSource) {
      return;
    }
    const nextId = this.nodeStateSource.getActiveStateId();
    const scene = this.document.getScene();
    for (const node of flattenNodes(scene)) {
      const needsUpdate =
        previousStateId === BASE_NODE_STATE_ID ||
        nextId === BASE_NODE_STATE_ID
          ? Boolean(
              node.stateOverrides && Object.keys(node.stateOverrides).length > 0,
            )
          : nodeHasStateOverride(node, previousStateId) ||
            nodeHasStateOverride(node, nextId);
      if (!needsUpdate) {
        continue;
      }
      applyResolvedNodeStateDisplay(this.renderer, node, nextId);
    }
    this.renderer.render();
  }

  private applyNodeStateOverlay(nodeId: string): void {
    if (!this.renderer || !this.nodeStateSource) {
      return;
    }
    const node = findNodeById(this.document.getScene(), nodeId);
    if (!node) {
      return;
    }
    applyResolvedNodeStateDisplay(
      this.renderer,
      node,
      this.nodeStateSource.getActiveStateId(),
    );
  }

  private rebuild(): void {
    if (!this.renderer) {
      return;
    }
    this.fullRebuildCount += 1;
    this.renderer.clear();
    for (const node of flattenNodes(this.document.getScene())) {
      this.renderer.createNode(node);
      this.applyNodeStateOverlay(node.id);
    }
    this.syncOverlay();
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
      this.applyNodeStateOverlay(entry.id);
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
        this.syncOverlay();
        break;
      }
      case "update": {
        if (mutation.reason === "metadata") {
          break;
        }
        const node = findNodeById(this.document.getScene(), mutation.nodeId);
        if (node) {
          this.renderer.updateNode(node);
          this.applyNodeStateOverlay(node.id);
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
          this.applyNodeStateOverlay(node.id);
        }
        this.syncOverlay();
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

  private syncOverlay(): void {
    if (!this.renderer || !this.overlay) {
      return;
    }
    this.overlay.sync(this.renderer, this.document.getScene());
  }
}
