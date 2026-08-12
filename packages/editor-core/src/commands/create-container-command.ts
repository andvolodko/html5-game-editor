import type { Command } from "@game-editor/commands";
import {
  allocateNumberedName,
  collectNodeNames,
  createContainerNode,
  findNodeById,
  nodeCanHaveChildren,
  type SceneNodeData,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";
import type {
  EditorSelection,
  SelectionManager,
} from "../selection-manager.js";

export class CreateContainerCommand implements Command {
  readonly name = "CreateContainer";
  private readonly node: SceneNodeData;
  private readonly parentId: string | undefined;
  private readonly index: number;
  private readonly previousSelection: EditorSelection;

  constructor(
    private readonly document: DocumentManager,
    private readonly selection: SelectionManager,
    parentId?: string,
  ) {
    const scene = document.getScene();
    const name = allocateNumberedName("Container", collectNodeNames(scene));
    this.parentId = parentId;
    this.node = createContainerNode(name, parentId);
    this.previousSelection = selection.getSelection();
    if (parentId !== undefined) {
      const parent = findNodeById(scene, parentId);
      if (!parent) {
        throw new Error(`CreateContainerCommand: unknown parent ${parentId}`);
      }
      if (!nodeCanHaveChildren(parent)) {
        throw new Error(
          `CreateContainerCommand: parent ${parentId} cannot have children`,
        );
      }
      this.index = parent.children.length;
    } else {
      this.index = scene.nodes.length;
    }
  }

  get createdNodeId(): string {
    return this.node.id;
  }

  execute(): void {
    this.document.insertNode(this.node, this.parentId, this.index);
    this.selection.setSelection([this.node.id]);
  }

  undo(): void {
    this.document.removeNode(this.node.id);
    this.selection.restore(this.previousSelection);
  }
}
