import type { Command } from "@game-editor/commands";
import {
  findNodeById,
  type NodeStateId,
  type NodeStateOverrides,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";

/**
 * Undoable write of one node's sparse overrides for one catalog state.
 * Stores cloned before/after bags (undefined = no entry).
 */
export class SetNodeStateOverrideCommand implements Command {
  readonly name = "SetNodeStateOverride";
  private readonly before: NodeStateOverrides | undefined;
  private readonly after: NodeStateOverrides | undefined;

  constructor(
    private readonly document: DocumentManager,
    private readonly nodeId: string,
    private readonly stateId: NodeStateId,
    after: NodeStateOverrides | undefined,
  ) {
    const node = findNodeById(document.getScene(), nodeId);
    if (!node) {
      throw new Error(`SetNodeStateOverrideCommand: unknown node ${nodeId}`);
    }
    const existing = node.stateOverrides?.[stateId];
    this.before =
      existing === undefined
        ? undefined
        : (JSON.parse(JSON.stringify(existing)) as NodeStateOverrides);
    this.after =
      after === undefined
        ? undefined
        : (JSON.parse(JSON.stringify(after)) as NodeStateOverrides);
  }

  execute(): void {
    this.document.setNodeStateOverrides(this.nodeId, this.stateId, this.after);
  }

  undo(): void {
    this.document.setNodeStateOverrides(this.nodeId, this.stateId, this.before);
  }
}
