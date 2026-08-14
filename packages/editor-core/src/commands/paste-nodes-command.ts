import type { Command } from "@game-editor/commands";
import {
  allocateDuplicateName,
  cloneNodeSubtree,
  collectNodeNames,
  type SceneNodeData,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";
import type {
  EditorSelection,
  SelectionManager,
} from "../selection-manager.js";

/**
 * Insert clipboard node snapshots as new subtrees (fresh ids) in one undo step.
 */
export class PasteNodesCommand implements Command {
  readonly name = "PasteNodes";
  private readonly clones: SceneNodeData[];
  private readonly previousSelection: EditorSelection;

  constructor(
    private readonly document: DocumentManager,
    private readonly selection: SelectionManager,
    templates: readonly SceneNodeData[],
    private readonly parentId: string | undefined,
    private readonly startIndex: number,
  ) {
    if (templates.length === 0) {
      throw new Error("PasteNodesCommand: clipboard is empty");
    }
    const usedNames = collectNodeNames(document.getScene());
    this.clones = templates.map((template) => {
      const clone = cloneNodeSubtree(template);
      clone.name = allocateDuplicateName(template.name, usedNames);
      usedNames.push(clone.name);
      return clone;
    });
    this.previousSelection = selection.getSelection();
  }

  get createdNodeIds(): readonly string[] {
    return this.clones.map((node) => node.id);
  }

  execute(): void {
    for (let i = 0; i < this.clones.length; i += 1) {
      const clone = this.clones[i];
      if (!clone) {
        continue;
      }
      this.document.insertNode(clone, this.parentId, this.startIndex + i);
    }
    this.selection.setSelection(this.clones.map((node) => node.id));
  }

  undo(): void {
    for (let i = this.clones.length - 1; i >= 0; i -= 1) {
      const clone = this.clones[i];
      if (clone) {
        this.document.removeNode(clone.id);
      }
    }
    this.selection.restore(this.previousSelection);
  }
}
