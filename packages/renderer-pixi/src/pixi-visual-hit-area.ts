import { Rectangle } from "pixi.js";
import type { VisualBounds } from "./visuals/types.js";

/**
 * Editor pick / hover rect. Exact visual (or HitZone union) bounds.
 * Selection chrome lives on `chromeRoot`, a sibling of `visualsRoot`, so it
 * must not pad this rect — Pixi would treat that padding as the node itself.
 */
export function hitAreaFromBounds(bounds: VisualBounds): Rectangle {
  return new Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);
}
