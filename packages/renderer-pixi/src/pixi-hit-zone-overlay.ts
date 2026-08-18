import { Graphics } from "pixi.js";
import {
  getHitZoneOffset,
  type HitZoneComponentData,
} from "@game-editor/scene";
import {
  HIT_ZONE_FILL_ALPHA,
  HIT_ZONE_FILL_COLOR,
  HIT_ZONE_STROKE_ALPHA,
  HIT_ZONE_STROKE_COLOR,
  HIT_ZONE_STROKE_WIDTH,
} from "./editor-chrome.js";
import { traceGraphicsShape } from "./pixi-graphics-shape.js";

export interface ShapeOverlayStyle {
  fill: number;
  stroke: number;
  fillAlpha: number;
  strokeAlpha: number;
  strokeWidth: number;
}

const HIT_ZONE_OVERLAY_STYLE: ShapeOverlayStyle = {
  fill: HIT_ZONE_FILL_COLOR,
  stroke: HIT_ZONE_STROKE_COLOR,
  fillAlpha: HIT_ZONE_FILL_ALPHA,
  strokeAlpha: HIT_ZONE_STROKE_ALPHA,
  strokeWidth: HIT_ZONE_STROKE_WIDTH,
};

/** Draw an editor-only HitZone overlay (eventMode none until made interactive). */
export function paintHitZoneOverlay(
  graphics: Graphics,
  hitZone: HitZoneComponentData | undefined,
  strokeScale: number,
  style: ShapeOverlayStyle = HIT_ZONE_OVERLAY_STYLE,
): void {
  graphics.clear();
  if (!hitZone) {
    graphics.visible = false;
    return;
  }
  graphics.visible = true;
  const offset = getHitZoneOffset(hitZone);
  traceGraphicsShape(graphics, hitZone.shape, offset);
  graphics.fill({ color: style.fill, alpha: style.fillAlpha });
  graphics.stroke({
    color: style.stroke,
    alpha: style.strokeAlpha,
    width: style.strokeWidth * strokeScale,
  });
}
