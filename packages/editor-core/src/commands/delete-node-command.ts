import type { Command } from "@game-editor/commands";
import {
  findNodeById,
  getNodeLocation,
  selectionAfterDelete,
  type SceneNodeData,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";
import type {
  EditorSelection,
  SelectionManager,
} from "../selection-manager.js";

export class DeleteNodeCommand implements Command {
  readonly name = "DeleteNode";
  private readonly parentId: string | undefined;
  private readonly index: number;
  private readonly node: SceneNodeData;
  private readonly siblingIds: string[];
  private readonly previousSelection: EditorSelection;
  private readonly previousNodeIds: readonly string[];

  constructor(
    private readonly document: DocumentManager,
    private readonly selection: SelectionManager,
    nodeId: string,
  ) {
    const scene = document.getScene();
    const location = getNodeLocation(scene, nodeId);
    const node = findNodeById(scene, nodeId);
    if (!location || !node) {
      throw new Error(`DeleteNodeCommand: unknown node ${nodeId}`);
    }
    this.parentId = location.parentId;
    this.index = location.index;
    this.node = node;
    this.siblingIds = location.siblings.map((n) => n.id);
    this.previousSelection = selection.getSelection();
    this.previousNodeIds = selection.getSelectedNodeIds();
  }

  execute(): void {
    this.document.removeNode(this.node.id);
    const next = selectionAfterDelete(
      this.document.getScene(),
      this.node.id,
      this.previousNodeIds,
      this.parentId,
      this.index,
      this.siblingIds,
    );
    this.selection.setSelection(next);
  }

  undo(): void {
    this.document.insertNode(this.node, this.parentId, this.index);
    this.selection.restore(this.previousSelection);
  }
}
