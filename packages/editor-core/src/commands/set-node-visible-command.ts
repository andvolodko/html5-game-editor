import type { Command } from "@game-editor/commands";
import { findNodeById, getNodeVisible } from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";

/** Sets serialized runtime/export visibility (omit when true). */
export class SetNodeVisibleCommand implements Command {
  readonly name = "SetNodeVisible";
  private readonly before: boolean;
  private readonly after: boolean;

  constructor(
    private readonly document: DocumentManager,
    private readonly nodeId: string,
    visible: boolean,
  ) {
    const node = findNodeById(document.getScene(), nodeId);
    if (!node) {
      throw new Error(`SetNodeVisibleCommand: unknown node ${nodeId}`);
    }
    this.before = getNodeVisible(node);
    this.after = visible;
  }

  execute(): void {
    this.document.setNodeVisible(this.nodeId, this.after);
  }

  undo(): void {
    this.document.setNodeVisible(this.nodeId, this.before);
  }
}
