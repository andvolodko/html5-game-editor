import type { Vec2 } from "./types.js";
import type { GraphicsShapeData } from "./visual-components.js";

/**
 * Designer-authored 2D pointer hit region. Not a leaf visual and not physics.
 * Shape is centered on `offset` (node-local), matching Graphics.
 */
export interface HitZoneComponentData {
  type: "HitZone";
  id: string;
  /** Omitted means enabled (`true`). Persist `false` when disabled. */
  enabled?: boolean;
  /** Local offset of the shape center. Omitted = `{ x: 0, y: 0 }`. */
  offset?: Vec2;
  shape: GraphicsShapeData;
}
