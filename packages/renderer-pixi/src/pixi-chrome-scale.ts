import type { Container } from "pixi.js";
import type { Vec2 } from "@game-editor/scene";

/**
 * Product of local scales from `from` up to (not including) `ancestor`.
 * Used to keep editor chrome screen-constant under node / parent scale
 * without picking up the preview camera (world's parent).
 */
export function localScaleTowardAncestor(
  from: Container,
  ancestor: Container,
): Vec2 {
  let x = 1;
  let y = 1;
  let current: Container | null = from;
  while (current && current !== ancestor) {
    // Pixi nulls `scale` on destroy(); in-flight paints can still walk a
    // stale container after clear / destroy+recreate of the same node id.
    const scale = current.scale;
    if (!scale) {
      break;
    }
    x *= scale.x;
    y *= scale.y;
    current = current.parent;
  }
  return { x, y };
}
