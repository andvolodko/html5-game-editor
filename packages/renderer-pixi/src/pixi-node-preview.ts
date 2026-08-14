import {
  DEFAULT_SPRITE_SIZE,
  DEFAULT_VISUAL_ANCHOR,
  getVisualAnchorOrDefault,
  getVisualComponent,
  getVisualDisplaySize,
  type Vec2,
} from "@game-editor/scene";
import type { RuntimeNode } from "./pixi-runtime-nodes.js";

export interface NodePreviewHost {
  getRuntime(nodeId: string): RuntimeNode | undefined;
  paintVisuals(runtime: RuntimeNode): Promise<void>;
  paintSelection(runtime: RuntimeNode): void;
}

/**
 * Live transform / size / anchor previews during pointer drags.
 * Commits happen via host pointer handlers → commands.
 */
export class PixiNodePreviewController {
  constructor(private readonly host: NodePreviewHost) {}

  previewNodePosition(nodeId: string, position: Vec2): void {
    const runtime = this.host.getRuntime(nodeId);
    if (!runtime) {
      return;
    }
    runtime.container.position.set(position.x, position.y);
  }

  previewSpriteSize(nodeId: string, width: number, height: number): void {
    const runtime = this.host.getRuntime(nodeId);
    if (!runtime) {
      return;
    }
    runtime.sizePreview = { width, height };
    const visual = getVisualComponent(runtime.node);
    const anchor =
      runtime.anchorPreview ??
      (visual ? getVisualAnchorOrDefault(visual) : DEFAULT_VISUAL_ANCHOR);
    runtime.visualBounds = {
      x: -anchor.x * width,
      y: -anchor.y * height,
      width,
      height,
    };
    const leaf = runtime.visual as
      | { width?: number; height?: number }
      | undefined;
    if (leaf) {
      if (typeof leaf.width === "number") {
        leaf.width = width;
      }
      if (typeof leaf.height === "number") {
        leaf.height = height;
      }
    }
    void this.host.paintVisuals(runtime);
    this.host.paintSelection(runtime);
  }

  previewNodeRotation(nodeId: string, rotationDegrees: number): void {
    const runtime = this.host.getRuntime(nodeId);
    if (!runtime) {
      return;
    }
    runtime.container.rotation = (rotationDegrees * Math.PI) / 180;
  }

  previewNodeScale(nodeId: string, scale: Vec2): void {
    const runtime = this.host.getRuntime(nodeId);
    if (!runtime) {
      return;
    }
    runtime.container.scale.set(scale.x, scale.y);
    this.host.paintSelection(runtime);
  }

  previewSpriteAnchor(nodeId: string, anchor: Vec2, position: Vec2): void {
    const runtime = this.host.getRuntime(nodeId);
    if (!runtime) {
      return;
    }
    runtime.container.position.set(position.x, position.y);
    runtime.anchorPreview = { ...anchor };
    const visual = getVisualComponent(runtime.node);
    const displaySize = visual ? getVisualDisplaySize(visual) : undefined;
    const width =
      runtime.sizePreview?.width ??
      displaySize?.width ??
      runtime.visualBounds?.width ??
      DEFAULT_SPRITE_SIZE;
    const height =
      runtime.sizePreview?.height ??
      displaySize?.height ??
      runtime.visualBounds?.height ??
      DEFAULT_SPRITE_SIZE;
    // Keep bounds + leaf pivot in sync before async paint finishes; otherwise
    // paintSelection would frame the old center and the texture would jump.
    runtime.visualBounds = {
      x: -anchor.x * width,
      y: -anchor.y * height,
      width,
      height,
    };
    const leaf = runtime.visual as
      | { anchor?: { set?: (x: number, y: number) => void } }
      | undefined;
    leaf?.anchor?.set?.(anchor.x, anchor.y);
    void this.host.paintVisuals(runtime);
    this.host.paintSelection(runtime);
  }
}
