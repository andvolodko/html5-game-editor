import { BASE_NODE_STATE_ID, type NodeStateId } from "@game-editor/scene";

type Listener = () => void;

/**
 * Editor-only active node-state selection. Not serialized into scene JSON.
 * Base is represented as `null` (`BASE_NODE_STATE_ID`).
 */
export class NodeStateEditSession {
  private activeStateId: NodeStateId | typeof BASE_NODE_STATE_ID =
    BASE_NODE_STATE_ID;
  private readonly listeners = new Set<Listener>();

  getActiveStateId(): NodeStateId | typeof BASE_NODE_STATE_ID {
    return this.activeStateId;
  }

  isBaseActive(): boolean {
    return this.activeStateId === BASE_NODE_STATE_ID;
  }

  setActiveStateId(stateId: NodeStateId | typeof BASE_NODE_STATE_ID): void {
    if (this.activeStateId === stateId) {
      return;
    }
    this.activeStateId = stateId;
    this.emit();
  }

  /** Clear to Base when the catalog entry was deleted / scene reloaded. */
  ensureActiveStateExists(catalogIds: ReadonlySet<string>): void {
    if (
      this.activeStateId !== BASE_NODE_STATE_ID &&
      !catalogIds.has(this.activeStateId)
    ) {
      this.activeStateId = BASE_NODE_STATE_ID;
      this.emit();
    }
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
