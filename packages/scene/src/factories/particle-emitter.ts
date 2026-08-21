import { createId } from "@game-editor/shared";
import {
  DEFAULT_NODE_SPAWN_POSITION,
  DEFAULT_PARTICLE_SEED,
} from "../defaults.js";
import {
  clampParticleMaxParticles,
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
  type ParticleEmitterComponentData,
} from "../particle-emitter-data.js";
import type { SceneNodeData, Vec2 } from "../types.js";
import { createNodeWithVisual } from "./scene.js";

export function createParticleEmitterComponent(
  partial?: Partial<Omit<ParticleEmitterComponentData, "type" | "id">> & {
    id?: string;
  },
): ParticleEmitterComponentData {
  const emissionSource =
    partial?.emission ?? createDefaultParticleEmission();
  const data: ParticleEmitterComponentData = {
    type: "ParticleEmitter",
    id: partial?.id ?? createId("comp"),
    seed: partial?.seed ?? DEFAULT_PARTICLE_SEED,
    playOnStart: partial?.playOnStart ?? true,
    loop: partial?.loop ?? true,
    prewarm: partial?.prewarm ?? false,
    emission: {
      rate: emissionSource.rate,
      maxParticles: clampParticleMaxParticles(emissionSource.maxParticles),
      ...(emissionSource.duration !== undefined
        ? { duration: emissionSource.duration }
        : {}),
    },
    lifetime: {
      ...(partial?.lifetime ?? createDefaultParticleLifetime()),
    },
    spawn: cloneParticleSpawn(
      partial?.spawn ?? createDefaultParticleSpawn(),
    ),
    velocity: {
      ...(partial?.velocity ?? createDefaultParticleVelocity()),
    },
    acceleration: {
      ...(partial?.acceleration ?? createDefaultParticleAcceleration()),
    },
    scale: cloneParticleCurve(
      partial?.scale ?? createDefaultParticleFadeCurve(),
    ),
    alpha: cloneParticleCurve(
      partial?.alpha ?? createDefaultParticleFadeCurve(),
    ),
    color: cloneParticleColorGradient(
      partial?.color ?? createDefaultParticleColorGradient(),
    ),
    rotation: {
      ...(partial?.rotation ?? createDefaultParticleRotation()),
    },
  };

  if (partial?.assetId !== undefined) {
    data.assetId = partial.assetId;
  }
  if (partial?.enabled !== undefined) {
    data.enabled = partial.enabled;
  }

  return data;
}

export function createParticleEmitterNode(
  name = "Particle Emitter",
  position: Vec2 = { ...DEFAULT_NODE_SPAWN_POSITION },
  emitter?: Partial<Omit<ParticleEmitterComponentData, "type" | "id">>,
): SceneNodeData {
  return createNodeWithVisual(
    name,
    position,
    createParticleEmitterComponent(emitter),
  );
}
