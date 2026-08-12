import type { Command } from "@game-editor/commands";
import {
  findNodeById,
  getVisualComponent,
  type VisualComponentData,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";

/**
 * Replaces the leaf visual component on a node with a patched clone.
 * One committed inspector edit = one undo step.
 */
export class SetVisualComponentCommand implements Command {
  readonly name = "SetVisualComponent";
  private readonly before: VisualComponentData;
  private readonly after: VisualComponentData;

  constructor(
    private readonly document: DocumentManager,
    private readonly nodeId: string,
    patch: Record<string, unknown>,
  ) {
    const node = findNodeById(document.getScene(), nodeId);
    const visual = node ? getVisualComponent(node) : undefined;
    if (!node || !visual) {
      throw new Error(
        `SetVisualComponentCommand: node ${nodeId} missing visual component`,
      );
    }

    this.before = structuredClone(visual);
    this.after = applyVisualPatch(visual, patch);
  }

  execute(): void {
    this.document.applyVisualComponent(this.nodeId, this.after);
  }

  undo(): void {
    this.document.applyVisualComponent(this.nodeId, this.before);
  }
}

function applyVisualPatch(
  current: VisualComponentData,
  patch: Record<string, unknown>,
): VisualComponentData {
  const next = structuredClone(current) as VisualComponentData &
    Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (key === "type" || key === "id") {
      continue;
    }
    if (value === undefined) {
      delete next[key];
    } else {
      next[key] = value;
    }
  }
  return next as VisualComponentData;
}
