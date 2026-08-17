import type { Command } from "@game-editor/commands";
import { type TileChange } from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";

/**
 * One paint/erase stroke. Stores only changed cells.
 */
export class PaintTilemapCommand implements Command {
  readonly name = "PaintTilemap";

  constructor(
    private readonly document: DocumentManager,
    private readonly nodeId: string,
    private readonly changes: readonly TileChange[],
  ) {}

  execute(): void {
    this.document.applyTilemapChanges(this.nodeId, this.changes, "after");
  }

  undo(): void {
    this.document.applyTilemapChanges(this.nodeId, this.changes, "before");
  }
}
