import type { Command } from "@game-editor/commands";
import type { DocumentManager } from "../document-manager.js";

export class SetSceneNameCommand implements Command {
  readonly name = "SetSceneName";
  private readonly before: string;
  private readonly after: string;

  constructor(
    private readonly document: DocumentManager,
    nextName: string,
  ) {
    this.before = document.getScene().name;
    const trimmed = nextName.trim();
    // Empty / whitespace-only → keep previous name (no-op execute).
    this.after = trimmed.length > 0 ? trimmed : this.before;
  }

  execute(): void {
    if (this.after === this.before) {
      return;
    }
    this.document.renameScene(this.after);
  }

  undo(): void {
    if (this.after === this.before) {
      return;
    }
    this.document.renameScene(this.before);
  }
}
