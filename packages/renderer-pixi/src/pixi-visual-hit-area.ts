import { Rectangle } from "pixi.js";
import { spriteGizmoHitOutsets, type Vec2 } from "@game-editor/scene";
import type { VisualBounds } from "./visuals/types.js";

export function hitAreaFromBounds(
  bounds: VisualBounds,
  cameraScale: number,
  nodeScale?: Vec2,
): Rectangle {
  const outset = spriteGizmoHitOutsets(cameraScale, nodeScale);
  return new Rectangle(
    bounds.x - outset.left,
    bounds.y - outset.top,
    bounds.width + outset.left + outset.right,
    bounds.height + outset.top + outset.bottom,
  );
}
