import type { ParticleCurve } from "../particle-emitter-data.js";

/**
 * Linear sample of a particle lifetime curve at normalized time `t` in [0, 1].
 * Points are sorted by time; empty curves return 0.
 */
export function evaluateCurve(curve: ParticleCurve, t: number): number {
  const points = curve.points;
  if (points.length === 0) {
    return 0;
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
    return first.value;
  }
  if (clamped >= last.time) {
    return last.value;
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
    return left.value;
  }
  const u = (clamped - left.time) / (right.time - left.time);
  return left.value + (right.value - left.value) * u;
}
