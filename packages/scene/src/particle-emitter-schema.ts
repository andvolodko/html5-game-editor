import { z } from "zod";
import { MAX_PARTICLE_COUNT } from "./defaults.js";
import { PARTICLE_SPAWN_SHAPE_TYPES } from "./particle-emitter-data.js";

export const particleCurvePointSchema = z.object({
  time: z.number().min(0).max(1),
  value: z.number(),
});

export const particleCurveSchema = z.object({
  points: z.array(particleCurvePointSchema).min(1),
});

export const particleColorPointSchema = z.object({
  time: z.number().min(0).max(1),
  color: z.number().int().nonnegative(),
});

export const particleColorGradientSchema = z.object({
  points: z.array(particleColorPointSchema).min(1),
});

export const particleSpawnShapeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("point") }),
  z.object({
    type: z.literal("circle"),
    radius: z.number().nonnegative(),
  }),
  z.object({
    type: z.literal("rectangle"),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
]);

export const particleEmissionSchema = z.object({
  rate: z.number().nonnegative(),
  maxParticles: z.number().int().min(0).max(MAX_PARTICLE_COUNT),
  duration: z.number().positive().optional(),
});

export const particleLifetimeSchema = z
  .object({
    min: z.number().positive(),
    max: z.number().positive(),
  })
  .superRefine((value, ctx) => {
    if (value.max < value.min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "lifetime.max must be >= lifetime.min",
        path: ["max"],
      });
    }
  });

export const particleVelocitySchema = z.object({
  speedMin: z.number().nonnegative(),
  speedMax: z.number().nonnegative(),
  angleMin: z.number(),
  angleMax: z.number(),
});

export const particleAccelerationSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const particleRotationSchema = z.object({
  startMin: z.number(),
  startMax: z.number(),
  speedMin: z.number(),
  speedMax: z.number(),
});

export const particleEmitterComponentSchema = z.object({
  type: z.literal("ParticleEmitter"),
  id: z.string().min(1),
  assetId: z.string().min(1).optional(),
  seed: z.number().int(),
  enabled: z.boolean().optional(),
  playOnStart: z.boolean(),
  loop: z.boolean(),
  prewarm: z.boolean(),
  emission: particleEmissionSchema,
  lifetime: particleLifetimeSchema,
  spawn: particleSpawnShapeSchema,
  velocity: particleVelocitySchema,
  acceleration: particleAccelerationSchema,
  scale: particleCurveSchema,
  alpha: particleCurveSchema,
  color: particleColorGradientSchema,
  rotation: particleRotationSchema,
});

/** Re-export for Inspector enum options. */
export { PARTICLE_SPAWN_SHAPE_TYPES };
