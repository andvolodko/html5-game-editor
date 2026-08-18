import type { Vec2 } from "./types.js";
import type { GraphicsShapeData } from "./visual-components.js";

export type MaskMode = "shape" | "sprite";

/**
 * Designer-authored 2D clip. Not a leaf visual, not physics, not HitZone.
 * Shape/sprite is centered on `offset` (node-local).
 */
export interface MaskComponentData {
  type: "Mask";
  id: string;
  /** Omitted means enabled (`true`). Persist `false` when disabled. */
  enabled?: boolean;
  /** Omitted means not inverse (`false`). Persist `true` when inverted. */
  inverse?: boolean;
  /** Local offset of the stencil center. Omitted = `{ x: 0, y: 0 }`. */
  offset?: Vec2;
  mode: MaskMode;
  /** Required when `mode` is `"shape"`. */
  shape?: GraphicsShapeData;
  /** Sprite-mode texture. Optional until assigned. */
  assetId?: string;
  /** Sprite-mode display size. Omit to use texture size. */
  width?: number;
  height?: number;
}
