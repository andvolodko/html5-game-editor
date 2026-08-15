import type { Command } from "@game-editor/commands";
import {
  findNodeById,
  isPrefabInstanceRoot,
  unpackPrefabInstance,
  type SceneNodeData,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";
import type {
  EditorSelection,
  SelectionManager,
} from "../selection-manager.js";

export class UnpackPrefabCommand implements Command {
  readonly name = "UnpackPrefab";
  private readonly previous: SceneNodeData;
  private readonly next: SceneNodeData;
  private readonly previousSelection: EditorSelection;

  constructor(
    private readonly document: DocumentManager,
    private readonly selection: SelectionManager,
    nodeId: string,
  ) {
    const node = findNodeById(document.getScene(), nodeId);
    if (!node || !isPrefabInstanceRoot(node)) {
      throw new Error(`UnpackPrefabCommand: node ${nodeId} is not a prefab instance root`);
    }
    this.previous = node;
    this.next = unpackPrefabInstance(node);
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
