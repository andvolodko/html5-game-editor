import type { Graphics } from "pixi.js";
import { DEFAULT_PARTICLE_POINT_BOUNDS_HALF } from "@game-editor/scene";
import type { ParticleEmitterComponentData } from "@game-editor/scene";
import { EDITOR_ACCENT_COLOR, EDITOR_MARQUEE_FILL_ALPHA } from "./editor-chrome.js";

/** Selection chrome matching spawn volume (not the pick/travel AABB). */
export function paintParticleEmitterSelection(
  selection: Graphics,
  data: ParticleEmitterComponentData,
  strokeWidth: number,
): void {
  const spawn = data.spawn;
  if (spawn.type === "circle") {
    selection.circle(0, 0, Math.max(0, spawn.radius));
  } else if (spawn.type === "rectangle") {
    const width = Math.max(0, spawn.width);
    const height = Math.max(0, spawn.height);
    selection.rect(-width / 2, -height / 2, width, height);
  } else {
    const half = DEFAULT_PARTICLE_POINT_BOUNDS_HALF;
    selection.moveTo(-half, 0);
    selection.lineTo(half, 0);
    selection.moveTo(0, -half);
    selection.lineTo(0, half);
  }
  selection.fill({
    color: EDITOR_ACCENT_COLOR,
    alpha: spawn.type === "point" ? 0 : EDITOR_MARQUEE_FILL_ALPHA,
  });
  selection.stroke({
    color: EDITOR_ACCENT_COLOR,
    width: strokeWidth,
  });
}
