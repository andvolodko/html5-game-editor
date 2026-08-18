import type { Command } from "@game-editor/commands";
import { findNodeById, getNodeAlpha } from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";

/** Sets serialized runtime/export opacity (omit when 1). */
export class SetNodeAlphaCommand implements Command {
  readonly name = "SetNodeAlpha";
  private readonly before: number;
  private readonly after: number;

  constructor(
    private readonly document: DocumentManager,
    private readonly nodeId: string,
    alpha: number,
  ) {
    const node = findNodeById(document.getScene(), nodeId);
    if (!node) {
      throw new Error(`SetNodeAlphaCommand: unknown node ${nodeId}`);
    }
    this.before = getNodeAlpha(node);
    this.after = alpha;
  }

  execute(): void {
    this.document.setNodeAlpha(this.nodeId, this.after);
  }

  undo(): void {
    this.document.setNodeAlpha(this.nodeId, this.before);
  }
}
