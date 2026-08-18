import type { LocalAabb } from "./local-aabb.js";
import type { HitZoneComponentData } from "./hit-zone-component.js";
import type { MaskComponentData } from "./mask-component.js";
import type { Vec2 } from "./types.js";
import type { GraphicsShapeData } from "./visual-components.js";
import { DEFAULT_GRAPHICS_SIZE } from "./defaults.js";
import { defaultGraphicsShape, hitZoneLocalAabb } from "./hit-zone-math.js";

const MASK_ORIGIN: Vec2 = { x: 0, y: 0 };

export function isMaskEnabled(mask: MaskComponentData): boolean {
  return mask.enabled !== false;
}

export function isMaskInverse(mask: MaskComponentData): boolean {
  return mask.inverse === true;
}

export function getMaskOffset(mask: MaskComponentData): Vec2 {
  return mask.offset ?? MASK_ORIGIN;
}

export function getMaskShape(
  mask: MaskComponentData,
): GraphicsShapeData | undefined {
  if (mask.mode !== "shape") {
    return undefined;
  }
  return mask.shape ?? defaultGraphicsShape("rectangle");
}

export function getMaskSpriteSize(mask: MaskComponentData): {
  width: number;
  height: number;
} {
  return {
    width:
      mask.width !== undefined && mask.width > 0
        ? mask.width
        : DEFAULT_GRAPHICS_SIZE,
    height:
      mask.height !== undefined && mask.height > 0
        ? mask.height
        : DEFAULT_GRAPHICS_SIZE,
  };
}

/**
 * HitZone-shaped view of a Mask for shared geometry / gizmo math.
 * Sprite mode maps to a centered rectangle of the mask display size.
 */
export function maskAsHitZone(
  mask: MaskComponentData,
): HitZoneComponentData | undefined {
  if (mask.mode === "shape") {
    const shape = getMaskShape(mask);
    if (!shape) {
      return undefined;
    }
    return hitZoneView(mask, shape);
  }
  const size = getMaskSpriteSize(mask);
  return hitZoneView(mask, {
    type: "rectangle",
    width: size.width,
    height: size.height,
  });
}

/** Axis-aligned bounds of the stencil in node-local space. */
export function maskLocalAabb(mask: MaskComponentData): LocalAabb | undefined {
  const asHitZone = maskAsHitZone(mask);
  return asHitZone ? hitZoneLocalAabb(asHitZone) : undefined;
}

function hitZoneView(
  mask: MaskComponentData,
  shape: GraphicsShapeData,
): HitZoneComponentData {
  const zone: HitZoneComponentData = {
    type: "HitZone",
    id: mask.id,
    shape,
  };
  if (mask.enabled === false) {
    zone.enabled = false;
  }
  if (mask.offset !== undefined) {
    zone.offset = mask.offset;
  }
  return zone;
}
