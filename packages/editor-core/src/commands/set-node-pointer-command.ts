import type { Command } from "@game-editor/commands";
import {
  findNodeById,
  getNodeCursor,
  getNodePointerChildren,
  getNodePointerEventMode,
  type NodePointerEventMode,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";

export interface NodePointerPatch {
  eventMode?: NodePointerEventMode;
  cursor?: string;
  children?: boolean;
}

/** Sets serialized playback pointer fields (event mode, cursor, children). */
export class SetNodePointerCommand implements Command {
  readonly name = "SetNodePointer";
  private readonly before: NodePointerPatch;
  private readonly after: NodePointerPatch;

  constructor(
    private readonly document: DocumentManager,
    private readonly nodeId: string,
    patch: NodePointerPatch,
  ) {
    const node = findNodeById(document.getScene(), nodeId);
    if (!node) {
      throw new Error(`SetNodePointerCommand: unknown node ${nodeId}`);
    }
    this.after = { ...patch };
    this.before = {};
    if (patch.eventMode !== undefined) {
      this.before.eventMode = getNodePointerEventMode(node);
    }
    if (patch.cursor !== undefined) {
      this.before.cursor = getNodeCursor(node);
    }
    if (patch.children !== undefined) {
      this.before.children = getNodePointerChildren(node);
    }
  }

  execute(): void {
    this.document.setNodePointer(this.nodeId, this.after);
  }

  undo(): void {
    this.document.setNodePointer(this.nodeId, this.before);
  }
}
