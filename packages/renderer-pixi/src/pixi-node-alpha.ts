import { getNodeAlpha, IDENTITY_NODE_ALPHA } from "@game-editor/scene";
import type { RuntimeNode } from "./pixi-runtime-nodes.js";

/**
 * Apply node opacity to visual content only.
 * Editor chrome (selection, gizmo, HitZone / Mask overlays) stays fully opaque.
 */
export function applyPixiNodeContentAlpha(
  runtime: RuntimeNode,
  alpha: number = getNodeAlpha(runtime.node),
): void {
  runtime.container.alpha = IDENTITY_NODE_ALPHA;
  if (runtime.visual && !runtime.visual.destroyed) {
    runtime.visual.alpha = alpha;
  }
  if (runtime.placeholder && !runtime.placeholder.destroyed) {
    runtime.placeholder.alpha = alpha;
  }
  if (runtime.childrenRoot && !runtime.childrenRoot.destroyed) {
    runtime.childrenRoot.alpha = alpha;
  }
}
