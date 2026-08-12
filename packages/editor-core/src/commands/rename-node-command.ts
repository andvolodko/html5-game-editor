import type { Command } from "@game-editor/commands";
import { findNodeById } from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";

export class RenameNodeCommand implements Command {
  readonly name = "RenameNode";
  private readonly before: string;
  private readonly after: string;

  constructor(
    private readonly document: DocumentManager,
    private readonly nodeId: string,
    nextName: string,
  ) {
    const node = findNodeById(document.getScene(), nodeId);
    if (!node) {
      throw new Error(`RenameNodeCommand: unknown node ${nodeId}`);
    }
    this.before = node.name;
    const trimmed = nextName.trim();
    // Empty / whitespace-only → keep previous name (no-op execute).
    this.after = trimmed.length > 0 ? trimmed : node.name;
  }

  execute(): void {
    if (this.after === this.before) {
      return;
    }
    this.document.renameNode(this.nodeId, this.after);
  }

  undo(): void {
    if (this.after === this.before) {
      return;
    }
    this.document.renameNode(this.nodeId, this.before);
  }
}
