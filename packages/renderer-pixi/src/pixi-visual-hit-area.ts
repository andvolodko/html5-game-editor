import { Rectangle } from "pixi.js";
import { spriteGizmoHitOutsets } from "@game-editor/scene";
import type { VisualBounds } from "./visuals/types.js";

export function hitAreaFromBounds(
  bounds: VisualBounds,
  cameraScale: number,
): Rectangle {
  const outset = spriteGizmoHitOutsets(cameraScale);
  return new Rectangle(
    bounds.x - outset.left,
    bounds.y - outset.top,
    bounds.width + outset.left + outset.right,
    bounds.height + outset.top + outset.bottom,
  );
}
