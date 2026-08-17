export type TilemapEditTool = "paint" | "erase" | "picker";

type Listener = () => void;

/**
 * Editor-only tile painting state. Not serialized.
 */
export class TilemapEditSession {
  private tool: TilemapEditTool = "paint";
  private selectedTileId = 0;
  private readonly listeners = new Set<Listener>();

  getTool(): TilemapEditTool {
    return this.tool;
  }

  setTool(tool: TilemapEditTool): void {
    if (this.tool === tool) {
      return;
    }
    this.tool = tool;
    this.emit();
  }

  getSelectedTileId(): number {
    return this.selectedTileId;
  }

  setSelectedTileId(tileId: number): void {
    if (this.selectedTileId === tileId) {
      return;
    }
    this.selectedTileId = tileId;
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
