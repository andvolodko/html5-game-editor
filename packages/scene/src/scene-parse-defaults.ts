import { createDefaultTextStyle } from "./factories/text.js";
import type { TextStyleData } from "./visual-components.js";
import {
  cloneParticleColorGradient,
  cloneParticleCurve,
  cloneParticleSpawn,
  createDefaultParticleAcceleration,
  createDefaultParticleColorGradient,
  createDefaultParticleEmission,
  createDefaultParticleFadeCurve,
  createDefaultParticleLifetime,
  createDefaultParticleRotation,
  createDefaultParticleSpawn,
  createDefaultParticleVelocity,
  PARTICLE_EMITTER_PARSE_DEFAULTS,
} from "./particle-emitter-data.js";
import { DEFAULT_PARTICLE_SEED } from "./defaults.js";

/**
 * Fill fields added after older scene JSON was written so Zod schemas can
 * keep those properties required (matches current TypeScript types).
 */
export function withSceneParseDefaults(input: unknown): unknown {
  if (!input || typeof input !== "object") {
    return input;
  }
  const scene = input as { nodes?: unknown };
  if (!Array.isArray(scene.nodes)) {
    return input;
  }
  return {
    ...scene,
    nodes: scene.nodes.map((node) => patchNodeTree(node)),
  };
}

function patchNodeTree(node: unknown): unknown {
  if (!node || typeof node !== "object") {
    return node;
  }
  const n = node as {
    components?: unknown[];
    children?: unknown[];
  };
  const components = Array.isArray(n.components)
    ? n.components.map((comp) => patchComponent(comp))
    : n.components;
  const children = Array.isArray(n.children)
    ? n.children.map((child) => patchNodeTree(child))
    : n.children;
  return { ...n, components, children };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function patchParticleEmitter(c: Record<string, unknown>): Record<string, unknown> {
  const emission = isRecord(c.emission)
    ? {
        ...createDefaultParticleEmission(),
        ...c.emission,
      }
    : { ...PARTICLE_EMITTER_PARSE_DEFAULTS.emission };
  const lifetime = isRecord(c.lifetime)
    ? {
        ...createDefaultParticleLifetime(),
        ...c.lifetime,
      }
    : { ...PARTICLE_EMITTER_PARSE_DEFAULTS.lifetime };
  const spawn = isRecord(c.spawn)
    ? (c.spawn as typeof PARTICLE_EMITTER_PARSE_DEFAULTS.spawn)
    : cloneParticleSpawn(createDefaultParticleSpawn());
  const velocity = isRecord(c.velocity)
    ? {
        ...createDefaultParticleVelocity(),
        ...c.velocity,
      }
    : { ...PARTICLE_EMITTER_PARSE_DEFAULTS.velocity };
  const acceleration = isRecord(c.acceleration)
    ? {
        ...createDefaultParticleAcceleration(),
        ...c.acceleration,
      }
    : { ...PARTICLE_EMITTER_PARSE_DEFAULTS.acceleration };
  const rotation = isRecord(c.rotation)
    ? {
        ...createDefaultParticleRotation(),
        ...c.rotation,
      }
    : { ...PARTICLE_EMITTER_PARSE_DEFAULTS.rotation };
  const scale =
    isRecord(c.scale) && Array.isArray(c.scale.points)
      ? (c.scale as unknown as ReturnType<typeof createDefaultParticleFadeCurve>)
      : cloneParticleCurve(createDefaultParticleFadeCurve());
  const alpha =
    isRecord(c.alpha) && Array.isArray(c.alpha.points)
      ? (c.alpha as unknown as ReturnType<typeof createDefaultParticleFadeCurve>)
      : cloneParticleCurve(createDefaultParticleFadeCurve());
  const color =
    isRecord(c.color) && Array.isArray(c.color.points)
      ? (c.color as unknown as ReturnType<
          typeof createDefaultParticleColorGradient
        >)
      : cloneParticleColorGradient(createDefaultParticleColorGradient());

  return {
    ...c,
    seed: typeof c.seed === "number" ? c.seed : DEFAULT_PARTICLE_SEED,
    playOnStart:
      typeof c.playOnStart === "boolean"
        ? c.playOnStart
        : PARTICLE_EMITTER_PARSE_DEFAULTS.playOnStart,
    loop:
      typeof c.loop === "boolean"
        ? c.loop
        : PARTICLE_EMITTER_PARSE_DEFAULTS.loop,
    prewarm:
      typeof c.prewarm === "boolean"
        ? c.prewarm
        : PARTICLE_EMITTER_PARSE_DEFAULTS.prewarm,
    emission,
    lifetime,
    spawn,
    velocity,
    acceleration,
    scale,
    alpha,
    color,
    rotation,
  };
}

function patchComponent(comp: unknown): unknown {
  if (!comp || typeof comp !== "object") {
    return comp;
  }
  const c = comp as Record<string, unknown>;
  if (c.type === "Model3D") {
    return {
      ...c,
      loop: typeof c.loop === "boolean" ? c.loop : true,
      timeScale:
        typeof c.timeScale === "number" && c.timeScale > 0 ? c.timeScale : 1,
      playing: typeof c.playing === "boolean" ? c.playing : true,
    };
  }
  if (c.type === "Text" || c.type === "HTMLText") {
    return {
      ...c,
      style: createDefaultTextStyle(
        isRecord(c.style) ? (c.style as Partial<TextStyleData>) : undefined,
      ),
    };
  }
  if (c.type === "ParticleEmitter") {
    return patchParticleEmitter(c);
  }
  return comp;
}
