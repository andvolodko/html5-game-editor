import type { Command } from "@game-editor/commands";
import {
  findNodeById,
  getNodeLocation,
  normalizeRootMostNodeIds,
  selectionAfterDelete,
  type SceneNodeData,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";
import type {
  EditorSelection,
  SelectionManager,
} from "../selection-manager.js";

interface DeletedNodeSnapshot {
  node: SceneNodeData;
  parentId: string | undefined;
  index: number;
  siblingIds: string[];
}

/**
 * Delete one or more root-most nodes as a single undo step with one selection write.
 */
export class DeleteNodesCommand implements Command {
  readonly name = "DeleteNodes";
  private readonly ordered: DeletedNodeSnapshot[];
  private readonly previousSelection: EditorSelection;
  private readonly previousNodeIds: readonly string[];
  private nextSelection: string[] | undefined;

  constructor(
    private readonly document: DocumentManager,
    private readonly selection: SelectionManager,
    nodeIds: readonly string[],
  ) {
    const scene = document.getScene();
    const roots = normalizeRootMostNodeIds(scene, nodeIds);
    if (roots.length === 0) {
      throw new Error("DeleteNodesCommand: no deletable nodes");
    }

    const snapshots: DeletedNodeSnapshot[] = roots.map((id) => {
      const location = getNodeLocation(scene, id);
      const node = findNodeById(scene, id);
      if (!location || !node) {
        throw new Error(`DeleteNodesCommand: unknown node ${id}`);
      }
      return {
        node,
        parentId: location.parentId,
        index: location.index,
        siblingIds: location.siblings.map((n) => n.id),
      };
    });

    // Detach high indices first within the same parent so earlier indices stay valid.
    this.ordered = [...snapshots].sort((a, b) => {
      if (a.parentId === b.parentId) {
        return b.index - a.index;
      }
      return 0;
    });

    this.previousSelection = selection.getSelection();
    this.previousNodeIds = selection.getSelectedNodeIds();
  }

  execute(): void {
    for (const entry of this.ordered) {
      this.document.removeNode(entry.node.id);
    }
    if (this.nextSelection === undefined) {
      this.nextSelection = this.computeNextSelection();
    }
    this.selection.setSelection(this.nextSelection);
  }

  undo(): void {
    // Reverse of detach order restores ascending indices within a parent.
    for (let i = this.ordered.length - 1; i >= 0; i -= 1) {
      const entry = this.ordered[i]!;
      this.document.insertNode(entry.node, entry.parentId, entry.index);
    }
    this.selection.restore(this.previousSelection);
  }

  private computeNextSelection(): string[] {
    const scene = this.document.getScene();
    const remaining = this.previousNodeIds.filter((id) =>
      findNodeById(scene, id),
    );
    if (remaining.length > 0) {
      return remaining;
    }

    const rootIds = new Set(this.ordered.map((e) => e.node.id));
    const primaryId =
      [...this.previousNodeIds].reverse().find((id) => rootIds.has(id)) ??
      this.ordered[this.ordered.length - 1]?.node.id;
    if (!primaryId) {
      return [];
    }
    const primary = this.ordered.find((e) => e.node.id === primaryId);
    if (!primary) {
      return [];
    }
    return selectionAfterDelete(
      scene,
      primary.node.id,
      this.previousNodeIds,
      primary.parentId,
      primary.index,
      primary.siblingIds,
    );
  }
}
