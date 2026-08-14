import type { Command } from "@game-editor/commands";
import {
  DEFAULT_VISUAL_ANCHOR,
  defaultVisualDisplaySize,
  findNodeById,
  getTransform2D,
  getTransform3D,
  getVisualComponent,
  IDENTITY_POSITION_2D,
  IDENTITY_POSITION_3D,
  IDENTITY_ROTATION_2D,
  IDENTITY_ROTATION_3D,
  IDENTITY_SCALE_2D,
  IDENTITY_SCALE_3D,
  visualComponentSupportsAnchor,
  visualComponentSupportsDisplaySize,
  type Transform2DComponentData,
  type Transform3DComponentData,
  type VisualComponentData,
} from "@game-editor/scene";
import type { DocumentManager } from "../document-manager.js";
import { cloneTransform2D } from "./clone-transform-2d.js";
import { cloneTransform3D } from "./clone-transform-3d.js";

export interface ResetNodeTransformOptions {
  /** Native texture/cel size when the visual references an asset. */
  displaySize?: { width: number; height: number };
}

function applyDisplaySize(
  visual: VisualComponentData,
  size: { width: number; height: number },
): void {
  switch (visual.type) {
    case "Sprite":
    case "NineSliceSprite":
    case "TilingSprite":
    case "MeshPlane":
    case "PerspectiveMesh":
    case "AnimatedSprite":
      visual.width = size.width;
      visual.height = size.height;
      break;
    default:
      break;
  }
}

function withResetVisualDefaults(
  visual: VisualComponentData,
  displaySize?: { width: number; height: number },
): VisualComponentData {
  const next = structuredClone(visual);
  if (visualComponentSupportsAnchor(next) && "anchor" in next) {
    next.anchor = { ...DEFAULT_VISUAL_ANCHOR };
  }
  if (visualComponentSupportsDisplaySize(next)) {
    const size = displaySize ?? defaultVisualDisplaySize(next);
    if (size) {
      applyDisplaySize(next, size);
    }
  }
  return next;
}

function shouldResetVisual(visual: VisualComponentData): boolean {
  return (
    visualComponentSupportsAnchor(visual) ||
    visualComponentSupportsDisplaySize(visual)
  );
}

/**
 * Reset a node's Transform2D/Transform3D (position, rotation, scale), visual
 * anchor, and display width/height to identity/defaults (one undo step).
 */
export class ResetNodeTransformCommand implements Command {
  readonly name = "ResetTransform";
  private readonly before2D: Transform2DComponentData | undefined;
  private readonly after2D: Transform2DComponentData | undefined;
  private readonly before3D: Transform3DComponentData | undefined;
  private readonly after3D: Transform3DComponentData | undefined;
  private readonly beforeVisual: VisualComponentData | undefined;
  private readonly afterVisual: VisualComponentData | undefined;

  constructor(
    private readonly document: DocumentManager,
    private readonly nodeId: string,
    options?: ResetNodeTransformOptions,
  ) {
    const node = findNodeById(document.getScene(), nodeId);
    const transform2D = node ? getTransform2D(node) : undefined;
    const transform3D = node ? getTransform3D(node) : undefined;
    if (!node || (!transform2D && !transform3D)) {
      throw new Error(
        `ResetNodeTransformCommand: node ${nodeId} has no transform`,
      );
    }

    if (transform2D) {
      this.before2D = cloneTransform2D(transform2D);
      this.after2D = cloneTransform2D({
        type: "Transform2D",
        id: transform2D.id,
        position: { ...IDENTITY_POSITION_2D },
        rotation: IDENTITY_ROTATION_2D,
        scale: { ...IDENTITY_SCALE_2D },
      });
    }
    if (transform3D) {
      this.before3D = cloneTransform3D(transform3D);
      this.after3D = cloneTransform3D({
        ...transform3D,
        position: { ...IDENTITY_POSITION_3D },
        rotation: { ...IDENTITY_ROTATION_3D },
        scale: { ...IDENTITY_SCALE_3D },
      });
    }

    const visual = getVisualComponent(node);
    if (visual && shouldResetVisual(visual)) {
      this.beforeVisual = structuredClone(visual);
      this.afterVisual = withResetVisualDefaults(visual, options?.displaySize);
    }
  }

  execute(): void {
    if (this.after2D) {
      this.document.applyTransform2D(this.nodeId, this.after2D);
    }
    if (this.after3D) {
      this.document.applyTransform3D(this.nodeId, this.after3D);
    }
    if (this.afterVisual) {
      this.document.applyVisualComponent(this.nodeId, this.afterVisual);
    }
  }

  undo(): void {
    if (this.before2D) {
      this.document.applyTransform2D(this.nodeId, this.before2D);
    }
    if (this.before3D) {
      this.document.applyTransform3D(this.nodeId, this.before3D);
    }
    if (this.beforeVisual) {
      this.document.applyVisualComponent(this.nodeId, this.beforeVisual);
    }
  }
}

export function createResetNodeTransformCommand(
  document: DocumentManager,
  nodeId: string,
  options?: ResetNodeTransformOptions,
): ResetNodeTransformCommand | undefined {
  const node = findNodeById(document.getScene(), nodeId);
  if (!node) {
    return undefined;
  }
  if (!getTransform2D(node) && !getTransform3D(node)) {
    return undefined;
  }
  return new ResetNodeTransformCommand(document, nodeId, options);
}
