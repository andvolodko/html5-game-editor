import { applyAff2Point, type Aff2 } from "./transform-math.js";

/** Axis-aligned box in a node's local 2D space. */
export interface LocalAabb {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Transform a local AABB by an affine pose and return the axis-aligned
 * bounding box of the four corners in the destination space.
 */
export function transformLocalAabb(bounds: LocalAabb, aff: Aff2): LocalAabb {
  const x0 = bounds.x;
  const y0 = bounds.y;
  const x1 = bounds.x + bounds.width;
  const y1 = bounds.y + bounds.height;
  const corners = [
    applyAff2Point(aff, { x: x0, y: y0 }),
    applyAff2Point(aff, { x: x1, y: y0 }),
    applyAff2Point(aff, { x: x0, y: y1 }),
    applyAff2Point(aff, { x: x1, y: y1 }),
  ];
  let minX = corners[0]!.x;
  let minY = corners[0]!.y;
  let maxX = minX;
  let maxY = minY;
  for (let i = 1; i < corners.length; i += 1) {
    const p = corners[i]!;
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/** Union of local AABBs. Skips empty boxes; returns undefined when none remain. */
export function unionLocalAabb(
  boxes: readonly LocalAabb[],
): LocalAabb | undefined {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let any = false;
  for (const box of boxes) {
    if (box.width <= 0 || box.height <= 0) {
      continue;
    }
    any = true;
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }
  if (!any) {
    return undefined;
  }
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/** True when two AABBs overlap (edges touching counts as a hit). */
export function aabbIntersects(a: LocalAabb, b: LocalAabb): boolean {
  return (
    a.x <= b.x + b.width &&
    a.x + a.width >= b.x &&
    a.y <= b.y + b.height &&
    a.y + a.height >= b.y
  );
}

/** Axis-aligned box spanning two corners (either direction). */
export function aabbFromCorners(
  a: { x: number; y: number },
  b: { x: number; y: number },
): LocalAabb {
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  return {
    x: minX,
    y: minY,
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}
