/**
 * Serializable ParticleEmitter component — library-agnostic config.
 * Pixi ParticleContainer is a renderer backend only; never store Pixi types here.
 */

import type { LocalAabb } from "./local-aabb.js";
import {
  DEFAULT_PARTICLE_ANGLE_MAX,
  DEFAULT_PARTICLE_ANGLE_MIN,
  DEFAULT_PARTICLE_COLOR,
  DEFAULT_PARTICLE_EMISSION_RATE,
  DEFAULT_PARTICLE_LIFETIME_MAX,
  DEFAULT_PARTICLE_LIFETIME_MIN,
  DEFAULT_PARTICLE_MAX_PARTICLES,
  DEFAULT_PARTICLE_POINT_BOUNDS_HALF,
  DEFAULT_PARTICLE_SEED,
  DEFAULT_PARTICLE_SPAWN_HEIGHT,
  DEFAULT_PARTICLE_SPAWN_RADIUS,
  DEFAULT_PARTICLE_SPAWN_WIDTH,
  DEFAULT_PARTICLE_SPEED_MAX,
  DEFAULT_PARTICLE_SPEED_MIN,
  MAX_PARTICLE_COUNT,
} from "./defaults.js";

export const PARTICLE_SPAWN_SHAPE_TYPES = [
  "point",
  "circle",
  "rectangle",
] as const;

export type ParticleSpawnShapeType = (typeof PARTICLE_SPAWN_SHAPE_TYPES)[number];

export interface ParticleCurvePoint {
  /** Normalized lifetime position in [0, 1] (birth → death). */
  time: number;
  value: number;
}

/**
 * Scalar over particle lifetime. MVP interpolates linearly between points.
 * Reserved for future interpolation modes without schema break.
 */
export interface ParticleCurve {
  points: ParticleCurvePoint[];
}

export interface ParticleColorPoint {
  /** Normalized lifetime position in [0, 1]. */
  time: number;
  /** RGB hex (0xRRGGBB), matching ColorField / Text fill. */
  color: number;
}

export interface ParticleColorGradient {
  points: ParticleColorPoint[];
}

export type ParticleSpawnShape =
  | { type: "point" }
  | { type: "circle"; radius: number }
  | { type: "rectangle"; width: number; height: number };

export interface ParticleEmissionConfig {
  /** Particles spawned per second. */
  rate: number;
  /** Cap on simultaneously alive particles. */
  maxParticles: number;
  /** Emitter run length in seconds; omit = infinite. */
  duration?: number;
}

export interface ParticleLifetimeConfig {
  min: number;
  max: number;
}

export interface ParticleVelocityConfig {
  speedMin: number;
  speedMax: number;
  /** Degrees. */
  angleMin: number;
  /** Degrees. */
  angleMax: number;
}

export interface ParticleAccelerationConfig {
  x: number;
  y: number;
}

export interface ParticleRotationConfig {
  /** Degrees at birth. */
  startMin: number;
  startMax: number;
  /** Degrees per second. */
  speedMin: number;
  speedMax: number;
}

export interface ParticleEmitterComponentData {
  type: "ParticleEmitter";
  id: string;
  /** Stable texture asset id — never a filesystem path. */
  assetId?: string;
  /** Deterministic RNG seed for preview/restart. */
  seed: number;
  /** Omitted = true. When false, simulation does not run. */
  enabled?: boolean;
  /** Start simulating when the node is created / scene loads. */
  playOnStart: boolean;
  /** Restart emission when duration elapses (ignored when duration omitted). */
  loop: boolean;
  /** Advance one lifetime of particles on start/restart. */
  prewarm: boolean;
  emission: ParticleEmissionConfig;
  lifetime: ParticleLifetimeConfig;
  spawn: ParticleSpawnShape;
  velocity: ParticleVelocityConfig;
  acceleration: ParticleAccelerationConfig;
  scale: ParticleCurve;
  alpha: ParticleCurve;
  color: ParticleColorGradient;
  rotation: ParticleRotationConfig;
}

/** Fade-out curve used by factory defaults (1 → 0). */
export function createDefaultParticleFadeCurve(): ParticleCurve {
  return {
    points: [
      { time: 0, value: 1 },
      { time: 1, value: 0 },
    ],
  };
}

/** Solid white gradient used by factory defaults. */
export function createDefaultParticleColorGradient(): ParticleColorGradient {
  return {
    points: [
      { time: 0, color: DEFAULT_PARTICLE_COLOR },
      { time: 1, color: DEFAULT_PARTICLE_COLOR },
    ],
  };
}

export function createDefaultParticleEmission(): ParticleEmissionConfig {
  return {
    rate: DEFAULT_PARTICLE_EMISSION_RATE,
    maxParticles: DEFAULT_PARTICLE_MAX_PARTICLES,
  };
}

export function createDefaultParticleLifetime(): ParticleLifetimeConfig {
  return {
    min: DEFAULT_PARTICLE_LIFETIME_MIN,
    max: DEFAULT_PARTICLE_LIFETIME_MAX,
  };
}

export function createDefaultParticleSpawn(): ParticleSpawnShape {
  return {
    type: "circle",
    radius: DEFAULT_PARTICLE_SPAWN_RADIUS,
  };
}

export function createDefaultParticleVelocity(): ParticleVelocityConfig {
  return {
    speedMin: DEFAULT_PARTICLE_SPEED_MIN,
    speedMax: DEFAULT_PARTICLE_SPEED_MAX,
    angleMin: DEFAULT_PARTICLE_ANGLE_MIN,
    angleMax: DEFAULT_PARTICLE_ANGLE_MAX,
  };
}

export function createDefaultParticleAcceleration(): ParticleAccelerationConfig {
  return { x: 0, y: 0 };
}

export function createDefaultParticleRotation(): ParticleRotationConfig {
  return {
    startMin: 0,
    startMax: 360,
    speedMin: -90,
    speedMax: 90,
  };
}

/** Clamp authored maxParticles into the safe range. */
export function clampParticleMaxParticles(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.min(Math.floor(value), MAX_PARTICLE_COUNT);
}

/**
 * Spawn-volume AABB for editor pick / hitArea (not the particle travel cloud).
 * Camera zoom outsets are applied by the renderer on visualsRoot.
 */
export function particleSpawnLocalBounds(
  data: ParticleEmitterComponentData,
): LocalAabb {
  return particleSpawnAabb(data.spawn);
}

/**
 * Spawn plus a conservative travel envelope (speed × lifetime + acceleration).
 * Used to frame content, not as the Scene click target.
 */
export function particleEmitterLocalBounds(
  data: ParticleEmitterComponentData,
): LocalAabb {
  const spawn = particleSpawnAabb(data.spawn);
  const lifetime = Math.max(0, data.lifetime.max);
  const speed = Math.max(
    0,
    Math.max(data.velocity.speedMin, data.velocity.speedMax),
  );
  const travel = speed * lifetime;
  const accPadX = 0.5 * Math.abs(data.acceleration.x) * lifetime * lifetime;
  const accPadY = 0.5 * Math.abs(data.acceleration.y) * lifetime * lifetime;
  let scaleMax = 0;
  for (const point of data.scale.points) {
    if (point.value > scaleMax) {
      scaleMax = point.value;
    }
  }
  const visualPad = Math.max(
    DEFAULT_PARTICLE_POINT_BOUNDS_HALF,
    scaleMax * DEFAULT_PARTICLE_POINT_BOUNDS_HALF,
  );
  const padX = travel + accPadX + visualPad;
  const padY = travel + accPadY + visualPad;
  return {
    x: spawn.x - padX,
    y: spawn.y - padY,
    width: spawn.width + padX * 2,
    height: spawn.height + padY * 2,
  };
}

function particleSpawnAabb(spawn: ParticleSpawnShape): LocalAabb {
  if (spawn.type === "circle") {
    const half = Math.max(spawn.radius, DEFAULT_PARTICLE_POINT_BOUNDS_HALF);
    return { x: -half, y: -half, width: half * 2, height: half * 2 };
  }
  if (spawn.type === "rectangle") {
    const width = Math.max(spawn.width, DEFAULT_PARTICLE_POINT_BOUNDS_HALF * 2);
    const height = Math.max(
      spawn.height,
      DEFAULT_PARTICLE_POINT_BOUNDS_HALF * 2,
    );
    return { x: -width / 2, y: -height / 2, width, height };
  }
  const half = DEFAULT_PARTICLE_POINT_BOUNDS_HALF;
  return { x: -half, y: -half, width: half * 2, height: half * 2 };
}

/** Deep-clone curve points for factories / presets. */
export function cloneParticleCurve(curve: ParticleCurve): ParticleCurve {
  return {
    points: curve.points.map((p) => ({ time: p.time, value: p.value })),
  };
}

export function cloneParticleColorGradient(
  gradient: ParticleColorGradient,
): ParticleColorGradient {
  return {
    points: gradient.points.map((p) => ({ time: p.time, color: p.color })),
  };
}

export function cloneParticleSpawn(spawn: ParticleSpawnShape): ParticleSpawnShape {
  if (spawn.type === "circle") {
    return { type: "circle", radius: spawn.radius };
  }
  if (spawn.type === "rectangle") {
    return {
      type: "rectangle",
      width: spawn.width,
      height: spawn.height,
    };
  }
  return { type: "point" };
}

/** Defaults used when parse-time fields are missing on older / partial JSON. */
export const PARTICLE_EMITTER_PARSE_DEFAULTS = {
  seed: DEFAULT_PARTICLE_SEED,
  playOnStart: true,
  loop: true,
  prewarm: false,
  emission: createDefaultParticleEmission(),
  lifetime: createDefaultParticleLifetime(),
  spawn: createDefaultParticleSpawn(),
  velocity: createDefaultParticleVelocity(),
  acceleration: createDefaultParticleAcceleration(),
  scale: createDefaultParticleFadeCurve(),
  alpha: createDefaultParticleFadeCurve(),
  color: createDefaultParticleColorGradient(),
  rotation: createDefaultParticleRotation(),
} as const;

export {
  DEFAULT_PARTICLE_SPAWN_RADIUS,
  DEFAULT_PARTICLE_SPAWN_WIDTH,
  DEFAULT_PARTICLE_SPAWN_HEIGHT,
};
