import type { ParticleColorGradient } from "../particle-emitter-data.js";

const CHANNEL_MASK = 0xff;
const RED_SHIFT = 16;
const GREEN_SHIFT = 8;

function channel(rgb: number, shift: number): number {
  return (rgb >>> shift) & CHANNEL_MASK;
}

function packRgb(r: number, g: number, b: number): number {
  return (
    ((Math.round(r) & CHANNEL_MASK) << RED_SHIFT) |
    ((Math.round(g) & CHANNEL_MASK) << GREEN_SHIFT) |
    (Math.round(b) & CHANNEL_MASK)
  );
}

/**
 * Linear RGB sample of a particle color gradient at normalized time `t` in [0, 1].
 * Empty gradients return white (0xffffff).
 */
export function evaluateGradient(
  gradient: ParticleColorGradient,
  t: number,
): number {
  const points = gradient.points;
  if (points.length === 0) {
    return 0xffffff;
  }
  const clamped = t <= 0 ? 0 : t >= 1 ? 1 : t;
  let first = points[0]!;
  let last = points[0]!;
  for (const point of points) {
    if (point.time < first.time) {
      first = point;
    }
    if (point.time > last.time) {
      last = point;
    }
  }
  if (clamped <= first.time) {
    return first.color;
  }
  if (clamped >= last.time) {
    return last.color;
  }

  let left = first;
  let right = last;
  for (const point of points) {
    if (point.time <= clamped && point.time >= left.time) {
      left = point;
    }
    if (point.time >= clamped && point.time <= right.time) {
      right = point;
    }
  }
  if (right.time === left.time) {
    return left.color;
  }
  const u = (clamped - left.time) / (right.time - left.time);
  const r =
    channel(left.color, RED_SHIFT) +
    (channel(right.color, RED_SHIFT) - channel(left.color, RED_SHIFT)) * u;
  const g =
    channel(left.color, GREEN_SHIFT) +
    (channel(right.color, GREEN_SHIFT) - channel(left.color, GREEN_SHIFT)) * u;
  const b =
    channel(left.color, 0) +
    (channel(right.color, 0) - channel(left.color, 0)) * u;
  return packRgb(r, g, b);
}
