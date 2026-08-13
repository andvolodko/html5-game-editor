export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize(v: Vec3): Vec3 | undefined {
  const length = Math.hypot(v.x, v.y, v.z);
  if (length < 1e-8) {
    return undefined;
  }
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

/**
 * Euler XYZ (radians) so a Three.js camera / Object3D looks at `target`.
 * Matches Object3D.lookAt + default rotation order, without importing THREE.
 */
export function lookAtEulerXyz(eye: Vec3, target: Vec3): Vec3 {
  const z = normalize({
    x: eye.x - target.x,
    y: eye.y - target.y,
    z: eye.z - target.z,
  });
  if (!z) {
    return { x: 0, y: 0, z: 0 };
  }

  const worldUp = { x: 0, y: 1, z: 0 };
  let x = normalize(cross(worldUp, z));
  if (!x) {
    x = { x: 1, y: 0, z: 0 };
  }
  const y = cross(z, x);

  const m11 = x.x;
  const m12 = y.x;
  const m13 = z.x;
  const m22 = y.y;
  const m23 = z.y;
  const m32 = y.z;
  const m33 = z.z;

  const ey = Math.asin(clamp(m13, -1, 1));
  if (Math.abs(m13) < 0.9999999) {
    return {
      x: Math.atan2(-m23, m33),
      y: ey,
      z: Math.atan2(-m12, m11),
    };
  }
  return {
    x: Math.atan2(m32, m22),
    y: ey,
    z: 0,
  };
}
