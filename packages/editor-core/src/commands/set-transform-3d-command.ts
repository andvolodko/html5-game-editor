import type { Command } from "@game-editor/commands";
import {
  findNodeById,
  getTransform3D,
  type Transform3DComponentData,
  type Vec3,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";

export interface Transform3DPatch {
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
}

function cloneTransform3D(
  transform: Transform3DComponentData,
): Transform3DComponentData {
  return {
    type: "Transform3D",
    id: transform.id,
    position: { ...transform.position },
    rotation: { ...transform.rotation },
    scale: { ...transform.scale },
  };
}

export class SetTransform3DCommand implements Command {
  readonly name = "SetTransform3D";
  private readonly before: Transform3DComponentData;
  private readonly after: Transform3DComponentData;

  constructor(
    private readonly document: DocumentManager,
    private readonly nodeId: string,
    patch: Transform3DPatch,
  ) {
    const node = findNodeById(document.getScene(), nodeId);
    const transform = node ? getTransform3D(node) : undefined;
    if (!node || !transform) {
      throw new Error(
        `SetTransform3DCommand: node ${nodeId} missing Transform3D`,
      );
    }

    this.before = cloneTransform3D(transform);
    this.after = cloneTransform3D({
      ...transform,
      ...(patch.position !== undefined
        ? { position: { ...patch.position } }
        : {}),
      ...(patch.rotation !== undefined
        ? { rotation: { ...patch.rotation } }
        : {}),
      ...(patch.scale !== undefined ? { scale: { ...patch.scale } } : {}),
    });
  }

  execute(): void {
    this.document.applyTransform3D(this.nodeId, this.after);
  }

  undo(): void {
    this.document.applyTransform3D(this.nodeId, this.before);
  }
}
