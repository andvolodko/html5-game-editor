/**
 * Built-in ParticleEmitter presets. Applying a preset copies values into the
 * component; no live preset id is persisted on scene JSON.
 */

import {
  cloneParticleColorGradient,
  cloneParticleCurve,
  cloneParticleSpawn,
  createDefaultParticleColorGradient,
  createDefaultParticleFadeCurve,
  type ParticleEmitterComponentData,
  type ParticleSpawnShape,
} from "./particle-emitter-data.js";

export const PARTICLE_PRESET_IDS = [
  "explosion",
  "fire",
  "smoke",
  "sparkles",
  "magic",
  "snow",
  "rain",
] as const;

export type ParticlePresetId = (typeof PARTICLE_PRESET_IDS)[number];

export const PARTICLE_PRESET_LABELS: Record<ParticlePresetId, string> = {
  explosion: "Explosion",
  fire: "Fire",
  smoke: "Smoke",
  sparkles: "Sparkles",
  magic: "Magic",
  snow: "Snow",
  rain: "Rain",
};

type ParticlePresetConfig = Omit<
  ParticleEmitterComponentData,
  "type" | "id" | "assetId" | "enabled"
>;

function curve(
  points: Array<{ time: number; value: number }>,
): ParticlePresetConfig["scale"] {
  return { points: points.map((p) => ({ ...p })) };
}

function gradient(
  points: Array<{ time: number; color: number }>,
): ParticlePresetConfig["color"] {
  return { points: points.map((p) => ({ ...p })) };
}

function circle(radius: number): ParticleSpawnShape {
  return { type: "circle", radius };
}

function rectangle(width: number, height: number): ParticleSpawnShape {
  return { type: "rectangle", width, height };
}

const PRESETS: Record<ParticlePresetId, ParticlePresetConfig> = {
  explosion: {
    seed: 42,
    playOnStart: true,
    loop: false,
    prewarm: false,
    emission: { rate: 0, maxParticles: 80, duration: 0.15 },
    lifetime: { min: 0.4, max: 0.9 },
    spawn: { type: "point" },
    velocity: {
      speedMin: 120,
      speedMax: 280,
      angleMin: 0,
      angleMax: 360,
    },
    acceleration: { x: 0, y: 40 },
    scale: curve([
      { time: 0, value: 1.2 },
      { time: 1, value: 0 },
    ]),
    alpha: curve([
      { time: 0, value: 1 },
      { time: 0.5, value: 0.8 },
      { time: 1, value: 0 },
    ]),
    color: gradient([
      { time: 0, color: 0xffee88 },
      { time: 0.4, color: 0xff6600 },
      { time: 1, color: 0x442200 },
    ]),
    rotation: {
      startMin: 0,
      startMax: 360,
      speedMin: -180,
      speedMax: 180,
    },
  },
  fire: {
    seed: 7,
    playOnStart: true,
    loop: true,
    prewarm: true,
    emission: { rate: 40, maxParticles: 120 },
    lifetime: { min: 0.5, max: 1.2 },
    spawn: circle(12),
    velocity: {
      speedMin: 30,
      speedMax: 80,
      angleMin: -110,
      angleMax: -70,
    },
    acceleration: { x: 0, y: -20 },
    scale: curve([
      { time: 0, value: 0.6 },
      { time: 0.3, value: 1 },
      { time: 1, value: 0.2 },
    ]),
    alpha: curve([
      { time: 0, value: 0.9 },
      { time: 0.6, value: 0.7 },
      { time: 1, value: 0 },
    ]),
    color: gradient([
      { time: 0, color: 0xffee66 },
      { time: 0.35, color: 0xff8800 },
      { time: 1, color: 0x881100 },
    ]),
    rotation: {
      startMin: 0,
      startMax: 360,
      speedMin: -40,
      speedMax: 40,
    },
  },
  smoke: {
    seed: 11,
    playOnStart: true,
    loop: true,
    prewarm: true,
    emission: { rate: 18, maxParticles: 80 },
    lifetime: { min: 1.2, max: 2.5 },
    spawn: circle(16),
    velocity: {
      speedMin: 10,
      speedMax: 40,
      angleMin: -100,
      angleMax: -80,
    },
    acceleration: { x: 8, y: -15 },
    scale: curve([
      { time: 0, value: 0.4 },
      { time: 1, value: 1.8 },
    ]),
    alpha: curve([
      { time: 0, value: 0.5 },
      { time: 0.4, value: 0.35 },
      { time: 1, value: 0 },
    ]),
    color: gradient([
      { time: 0, color: 0xaaaaaa },
      { time: 1, color: 0x555555 },
    ]),
    rotation: {
      startMin: 0,
      startMax: 360,
      speedMin: -20,
      speedMax: 20,
    },
  },
  sparkles: {
    seed: 3,
    playOnStart: true,
    loop: true,
    prewarm: false,
    emission: { rate: 30, maxParticles: 100 },
    lifetime: { min: 0.4, max: 1 },
    spawn: circle(40),
    velocity: {
      speedMin: 5,
      speedMax: 40,
      angleMin: 0,
      angleMax: 360,
    },
    acceleration: { x: 0, y: 30 },
    scale: curve([
      { time: 0, value: 0 },
      { time: 0.2, value: 1 },
      { time: 1, value: 0 },
    ]),
    alpha: curve([
      { time: 0, value: 0 },
      { time: 0.15, value: 1 },
      { time: 1, value: 0 },
    ]),
    color: gradient([
      { time: 0, color: 0xffffff },
      { time: 0.5, color: 0xffeebb },
      { time: 1, color: 0xffcc66 },
    ]),
    rotation: {
      startMin: 0,
      startMax: 360,
      speedMin: -120,
      speedMax: 120,
    },
  },
  magic: {
    seed: 99,
    playOnStart: true,
    loop: true,
    prewarm: false,
    emission: { rate: 25, maxParticles: 90 },
    lifetime: { min: 0.8, max: 1.6 },
    spawn: circle(8),
    velocity: {
      speedMin: 20,
      speedMax: 70,
      angleMin: 0,
      angleMax: 360,
    },
    acceleration: { x: 0, y: -10 },
    scale: curve([
      { time: 0, value: 0.3 },
      { time: 0.4, value: 1 },
      { time: 1, value: 0 },
    ]),
    alpha: createDefaultParticleFadeCurve(),
    color: gradient([
      { time: 0, color: 0xaa66ff },
      { time: 0.5, color: 0x66ccff },
      { time: 1, color: 0xff66cc },
    ]),
    rotation: {
      startMin: 0,
      startMax: 360,
      speedMin: -90,
      speedMax: 90,
    },
  },
  snow: {
    seed: 21,
    playOnStart: true,
    loop: true,
    prewarm: true,
    emission: { rate: 35, maxParticles: 150 },
    lifetime: { min: 3, max: 5 },
    spawn: rectangle(400, 20),
    velocity: {
      speedMin: 20,
      speedMax: 50,
      angleMin: 70,
      angleMax: 110,
    },
    acceleration: { x: 5, y: 10 },
    scale: curve([
      { time: 0, value: 0.4 },
      { time: 1, value: 0.4 },
    ]),
    alpha: curve([
      { time: 0, value: 0 },
      { time: 0.1, value: 0.9 },
      { time: 0.9, value: 0.9 },
      { time: 1, value: 0 },
    ]),
    color: createDefaultParticleColorGradient(),
    rotation: {
      startMin: 0,
      startMax: 360,
      speedMin: -30,
      speedMax: 30,
    },
  },
  rain: {
    seed: 5,
    playOnStart: true,
    loop: true,
    prewarm: true,
    emission: { rate: 120, maxParticles: 300 },
    lifetime: { min: 0.6, max: 1 },
    spawn: rectangle(500, 10),
    velocity: {
      speedMin: 280,
      speedMax: 360,
      angleMin: 95,
      angleMax: 105,
    },
    acceleration: { x: 0, y: 80 },
    scale: curve([
      { time: 0, value: 0.15 },
      { time: 1, value: 0.15 },
    ]),
    alpha: curve([
      { time: 0, value: 0.5 },
      { time: 1, value: 0.3 },
    ]),
    color: gradient([
      { time: 0, color: 0xaaccff },
      { time: 1, color: 0x88aadd },
    ]),
    rotation: {
      startMin: 0,
      startMax: 0,
      speedMin: 0,
      speedMax: 0,
    },
  },
};

/** Returns a deep copy of preset values safe to merge into a component. */
export function getParticlePresetConfig(
  id: ParticlePresetId,
): ParticlePresetConfig {
  const preset = PRESETS[id];
  return {
    seed: preset.seed,
    playOnStart: preset.playOnStart,
    loop: preset.loop,
    prewarm: preset.prewarm,
    emission: {
      rate: preset.emission.rate,
      maxParticles: preset.emission.maxParticles,
      ...(preset.emission.duration !== undefined
        ? { duration: preset.emission.duration }
        : {}),
    },
    lifetime: { ...preset.lifetime },
    spawn: cloneParticleSpawn(preset.spawn),
    velocity: { ...preset.velocity },
    acceleration: { ...preset.acceleration },
    scale: cloneParticleCurve(preset.scale),
    alpha: cloneParticleCurve(preset.alpha),
    color: cloneParticleColorGradient(preset.color),
    rotation: { ...preset.rotation },
  };
}

/** Patch object suitable for `setVisualComponent` (keeps id/type/assetId). */
export function particlePresetToVisualPatch(
  id: ParticlePresetId,
): Record<string, unknown> {
  const config = getParticlePresetConfig(id);
  return { ...config };
}
