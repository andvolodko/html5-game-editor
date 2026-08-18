import type { Command } from "@game-editor/commands";
import {
  findNodeById,
  getHitZone,
  type HitZoneComponentData,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";

export type HitZonePatch = Partial<Omit<HitZoneComponentData, "type" | "id">>;

/**
 * Replaces the HitZone on a node with a patched clone.
 * One Inspector / gizmo commit = one undo step.
 */
export class SetHitZoneCommand implements Command {
  readonly name = "SetHitZone";
  private readonly before: HitZoneComponentData;
  private readonly after: HitZoneComponentData;

  constructor(
    private readonly document: DocumentManager,
    private readonly nodeId: string,
    patch: HitZonePatch,
  ) {
    const node = findNodeById(document.getScene(), nodeId);
    const hitZone = node ? getHitZone(node) : undefined;
    if (!node || !hitZone) {
      throw new Error(`SetHitZoneCommand: node ${nodeId} missing HitZone`);
    }
    this.before = structuredClone(hitZone);
    this.after = applyHitZonePatch(hitZone, patch);
  }

  execute(): void {
    this.document.applyHitZoneComponent(this.nodeId, this.after);
  }

  undo(): void {
    this.document.applyHitZoneComponent(this.nodeId, this.before);
  }
}

function applyHitZonePatch(
  current: HitZoneComponentData,
  patch: HitZonePatch,
): HitZoneComponentData {
  const next: HitZoneComponentData = {
    ...structuredClone(current),
    ...structuredClone(patch),
    type: "HitZone",
    id: current.id,
  };
  if (next.enabled !== false) {
    delete next.enabled;
  }
  if (next.offset !== undefined && next.offset.x === 0 && next.offset.y === 0) {
    delete next.offset;
  }
  return next;
}
