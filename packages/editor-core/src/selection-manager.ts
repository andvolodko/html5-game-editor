import {
  applyListSelection,
  type ListSelectionModifiers,
} from "./list-selection.js";

type Listener = () => void;

/**
 * Editor selection. Scene document vs nodes are mutually exclusive —
 * the scene is never a `SceneNodeData` in the hierarchy graph.
 */
export type EditorSelection =
  | { kind: "none" }
  | { kind: "scene" }
  | { kind: "nodes"; nodeIds: readonly string[] };

/**
 * Editor selection state. Never stores PIXI/THREE runtime objects.
 * `selectedNodeIds` order: earlier = older; last entry is the primary/active node.
 */
export class SelectionManager {
  private selectedNodeIds: string[] = [];
  private sceneSelected = false;
  /** Shift-range origin (last non-shift click / toggle). */
  private anchorNodeId: string | undefined;
  private readonly listeners = new Set<Listener>();

  getSelection(): EditorSelection {
    if (this.sceneSelected) {
      return { kind: "scene" };
    }
    if (this.selectedNodeIds.length === 0) {
      return { kind: "none" };
    }
    return { kind: "nodes", nodeIds: [...this.selectedNodeIds] };
  }

  isSceneSelected(): boolean {
    return this.sceneSelected;
  }

  getSelectedNodeIds(): readonly string[] {
    return this.selectedNodeIds;
  }

  /** Primary node for Inspector / single-target actions (last selected). */
  getPrimaryNodeId(): string | undefined {
    return this.selectedNodeIds[this.selectedNodeIds.length - 1];
  }

  /** Select the open scene document (clears node selection). */
  selectScene(): void {
    if (this.sceneSelected && this.selectedNodeIds.length === 0) {
      return;
    }
    this.sceneSelected = true;
    this.selectedNodeIds = [];
    this.anchorNodeId = undefined;
    this.emit();
  }

  setSelection(nodeIds: readonly string[]): void {
    this.sceneSelected = false;
    this.selectedNodeIds = [...nodeIds];
    this.anchorNodeId = nodeIds[nodeIds.length - 1];
    this.emit();
  }

  /**
   * Hierarchy / viewport list click: Shift range, Ctrl toggle, Ctrl+Shift add range.
   */
  applyVisibleListClick(
    orderedVisibleIds: readonly string[],
    clickedId: string,
    modifiers: ListSelectionModifiers,
  ): void {
    const next = applyListSelection(
      orderedVisibleIds,
      this.selectedNodeIds,
      clickedId,
      modifiers,
      this.anchorNodeId,
    );
    this.sceneSelected = false;
    this.selectedNodeIds = next.selected;
    this.anchorNodeId = next.anchor;
    this.emit();
  }

  /** Ctrl/Cmd toggle: add as primary or remove. Clears scene selection. */
  toggleNode(nodeId: string): void {
    this.sceneSelected = false;
    const index = this.selectedNodeIds.indexOf(nodeId);
    if (index >= 0) {
      this.selectedNodeIds = this.selectedNodeIds.filter((id) => id !== nodeId);
    } else {
      this.selectedNodeIds = [...this.selectedNodeIds, nodeId];
    }
    this.anchorNodeId = nodeId;
    this.emit();
  }

  /** Restore a prior snapshot (undo / command rollback). */
  restore(selection: EditorSelection): void {
    switch (selection.kind) {
      case "none":
        this.clear();
        break;
      case "scene":
        this.selectScene();
        break;
      case "nodes":
        this.setSelection(selection.nodeIds);
        break;
    }
  }

  clear(): void {
    if (!this.sceneSelected && this.selectedNodeIds.length === 0) {
      return;
    }
    this.sceneSelected = false;
    this.selectedNodeIds = [];
    this.anchorNodeId = undefined;
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
