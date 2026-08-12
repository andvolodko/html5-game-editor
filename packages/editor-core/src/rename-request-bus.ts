import type { SelectionManager } from "./selection-manager.js";

/** Inline rename target: scene document or a hierarchy node. */
export type RenameRequestTarget =
  | { kind: "scene" }
  | { kind: "node"; nodeId: string };

export type RenameRequestListener = (target: RenameRequestTarget) => void;

/**
 * Ask the Hierarchy (or other UI) to begin inline rename.
 * Prefer this over DOM CustomEvents.
 */
export class RenameRequestBus {
  private readonly listeners = new Set<RenameRequestListener>();

  requestRename(selection: SelectionManager, nodeId?: string): void {
    let target: RenameRequestTarget | undefined;
    if (nodeId !== undefined) {
      target = { kind: "node", nodeId };
    } else if (selection.isSceneSelected()) {
      target = { kind: "scene" };
    } else {
      const id = selection.getPrimaryNodeId();
      if (id) {
        target = { kind: "node", nodeId: id };
      }
    }
    if (!target) {
      return;
    }
    for (const listener of this.listeners) {
      listener(target);
    }
  }

  onRenameRequest(listener: RenameRequestListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  clear(): void {
    this.listeners.clear();
  }
}
