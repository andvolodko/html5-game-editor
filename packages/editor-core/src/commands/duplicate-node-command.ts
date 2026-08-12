import type { Command } from "@game-editor/commands";
import {
  allocateDuplicateName,
  cloneNodeSubtree,
  collectNodeNames,
  findNodeById,
  getNodeLocation,
  type SceneNodeData,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";
import type {
  EditorSelection,
  SelectionManager,
} from "../selection-manager.js";

export class DuplicateNodeCommand implements Command {
  readonly name = "DuplicateNode";
  private readonly clone: SceneNodeData;
  private readonly parentId: string | undefined;
  private readonly index: number;
  private readonly previousSelection: EditorSelection;

  constructor(
    private readonly document: DocumentManager,
    private readonly selection: SelectionManager,
    sourceNodeId: string,
  ) {
    const scene = document.getScene();
    const source = findNodeById(scene, sourceNodeId);
    const location = getNodeLocation(scene, sourceNodeId);
    if (!source || !location) {
      throw new Error(`DuplicateNodeCommand: unknown node ${sourceNodeId}`);
    }
    this.clone = cloneNodeSubtree(source);
    this.clone.name = allocateDuplicateName(
      source.name,
      collectNodeNames(scene),
    );
    this.parentId = location.parentId;
    // Insert immediately after original (pre-detach coords → post = index+1).
    this.index = location.index + 1;
    this.previousSelection = selection.getSelection();
  }

  get createdNodeId(): string {
    return this.clone.id;
  }

  execute(): void {
    this.document.insertNode(this.clone, this.parentId, this.index);
    this.selection.setSelection([this.clone.id]);
  }

  undo(): void {
    this.document.removeNode(this.clone.id);
    this.selection.restore(this.previousSelection);
  }
}
