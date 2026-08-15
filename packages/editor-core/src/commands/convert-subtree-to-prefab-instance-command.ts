import type { Command } from "@game-editor/commands";
import {
  cloneSerializableNode,
  findNodeById,
  type SceneNodeData,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";
import type {
  EditorSelection,
  SelectionManager,
} from "../selection-manager.js";

export class ConvertSubtreeToPrefabInstanceCommand implements Command {
  readonly name = "ConvertSubtreeToPrefabInstance";
  private readonly previous: SceneNodeData;
  private readonly next: SceneNodeData;
  private readonly previousSelection: EditorSelection;

  constructor(
    private readonly document: DocumentManager,
    private readonly selection: SelectionManager,
    previousNodeId: string,
    instance: SceneNodeData,
  ) {
    const node = findNodeById(document.getScene(), previousNodeId);
    if (!node) {
      throw new Error(
        `ConvertSubtreeToPrefabInstanceCommand: unknown node ${previousNodeId}`,
      );
    }
    this.previous = cloneSerializableNode(node);
    this.next = instance;
    this.previousSelection = selection.getSelection();
  }

  execute(): void {
    this.document.replaceNodeSubtree(this.previous.id, this.next);
    this.selection.setSelection([this.next.id]);
  }

  undo(): void {
    this.document.replaceNodeSubtree(this.next.id, this.previous);
    this.selection.restore(this.previousSelection);
  }
}
