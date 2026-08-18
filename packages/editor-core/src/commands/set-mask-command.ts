import type { Command } from "@game-editor/commands";
import {
  defaultGraphicsShape,
  findNodeById,
  getMask,
  type MaskComponentData,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";

export type MaskPatch = Partial<Omit<MaskComponentData, "type" | "id">>;

/**
 * Replaces the Mask on a node with a patched clone.
 * One Inspector / gizmo commit = one undo step.
 */
export class SetMaskCommand implements Command {
  readonly name = "SetMask";
  private readonly before: MaskComponentData;
  private readonly after: MaskComponentData;

  constructor(
    private readonly document: DocumentManager,
    private readonly nodeId: string,
    patch: MaskPatch,
  ) {
    const node = findNodeById(document.getScene(), nodeId);
    const mask = node ? getMask(node) : undefined;
    if (!node || !mask) {
      throw new Error(`SetMaskCommand: node ${nodeId} missing Mask`);
    }
    this.before = structuredClone(mask);
    this.after = applyMaskPatch(mask, patch);
  }

  execute(): void {
    this.document.applyMaskComponent(this.nodeId, this.after);
  }

  undo(): void {
    this.document.applyMaskComponent(this.nodeId, this.before);
  }
}

function applyMaskPatch(
  current: MaskComponentData,
  patch: MaskPatch,
): MaskComponentData {
  const next: MaskComponentData = {
    ...structuredClone(current),
    ...structuredClone(patch),
    type: "Mask",
    id: current.id,
  };
  if (next.enabled !== false) {
    delete next.enabled;
  }
  if (next.inverse !== true) {
    delete next.inverse;
  }
  if (next.offset !== undefined && next.offset.x === 0 && next.offset.y === 0) {
    delete next.offset;
  }
  if (next.mode === "shape") {
    if (next.shape === undefined) {
      next.shape = defaultGraphicsShape("rectangle");
    }
    delete next.assetId;
    delete next.width;
    delete next.height;
  } else {
    delete next.shape;
  }
  return next;
}
