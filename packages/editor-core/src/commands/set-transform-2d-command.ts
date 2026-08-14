import type { Command } from "@game-editor/commands";
import {
  findNodeById,
  getTransform2D,
  type Transform2DComponentData,
  type Vec2,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";
import { cloneTransform2D } from "./clone-transform-2d.js";

export interface Transform2DPatch {
  position?: Vec2;
  rotation?: number;
  scale?: Vec2;
  skew?: Vec2;
}

export class SetTransform2DCommand implements Command {
  readonly name = "SetTransform2D";
  private readonly before: Transform2DComponentData;
  private readonly after: Transform2DComponentData;

  constructor(
    private readonly document: DocumentManager,
    private readonly nodeId: string,
    patch: Transform2DPatch,
  ) {
    const node = findNodeById(document.getScene(), nodeId);
    const transform = node ? getTransform2D(node) : undefined;
    if (!node || !transform) {
      throw new Error(
        `SetTransform2DCommand: node ${nodeId} missing Transform2D`,
      );
    }

    this.before = cloneTransform2D(transform);
    const after = cloneTransform2D({
      ...transform,
      ...(patch.position !== undefined
        ? { position: { ...patch.position } }
        : {}),
      ...(patch.rotation !== undefined ? { rotation: patch.rotation } : {}),
      ...(patch.scale !== undefined ? { scale: { ...patch.scale } } : {}),
    });
    if (patch.skew !== undefined) {
      if (patch.skew.x === 0 && patch.skew.y === 0) {
        delete after.skew;
      } else {
        after.skew = { ...patch.skew };
      }
    }
    this.after = after;
  }

  execute(): void {
    this.document.applyTransform2D(this.nodeId, this.after);
  }

  undo(): void {
    this.document.applyTransform2D(this.nodeId, this.before);
  }
}
