type Listener = () => void;

/**
 * Editor selection state. Never stores PIXI/THREE runtime objects.
 */
export class SelectionManager {
  private selectedNodeIds: string[] = [];
  private readonly listeners = new Set<Listener>();

  getSelectedNodeIds(): readonly string[] {
    return this.selectedNodeIds;
  }

  setSelection(nodeIds: readonly string[]): void {
    this.selectedNodeIds = [...nodeIds];
    this.emit();
  }

  clear(): void {
    if (this.selectedNodeIds.length === 0) {
      return;
    }
    this.selectedNodeIds = [];
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
