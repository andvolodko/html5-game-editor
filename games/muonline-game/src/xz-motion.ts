export interface XzPoint {
  x: number;
  z: number;
}

export interface XzBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function xzDistance(a: XzPoint, b: XzPoint): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

export function clampXz(point: XzPoint, bounds: XzBounds): XzPoint {
  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, point.x)),
    z: Math.min(bounds.maxZ, Math.max(bounds.minZ, point.z)),
  };
}

export function randomPointInBounds(bounds: XzBounds): XzPoint {
  return {
    x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
    z: bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ),
  };
}

/**
 * Yaw around world up for MU models that stand via Euler X ≈ -π/2.
 * Forward at yaw 0 is +Z; store the result in Transform3D.rotation.z.
 */
export function yawToward(dx: number, dz: number): number {
  return Math.atan2(dx, dz);
}

/** Yaw from `from` toward `to`, or undefined when the span is too small. */
export function yawFromTo(from: XzPoint, to: XzPoint): number | undefined {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  if (Math.hypot(dx, dz) < 0.001) {
    return undefined;
  }
  return yawToward(dx, dz);
}

export function moveToward(
  from: XzPoint,
  to: XzPoint,
  distance: number,
): XzPoint {
  const span = xzDistance(from, to);
  if (span <= distance || span === 0) {
    return { x: to.x, z: to.z };
  }
  const t = distance / span;
  return {
    x: from.x + (to.x - from.x) * t,
    z: from.z + (to.z - from.z) * t,
  };
}
