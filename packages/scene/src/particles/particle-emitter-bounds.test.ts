import { describe, expect, it } from "vitest";
import { DEFAULT_PARTICLE_POINT_BOUNDS_HALF } from "../defaults.js";
import { createParticleEmitterComponent } from "../factories/particle-emitter.js";
import {
  particleEmitterLocalBounds,
  particleSpawnLocalBounds,
} from "../particle-emitter-data.js";

describe("particleSpawnLocalBounds", () => {
  it("is the spawn volume only (circle diameter)", () => {
    const data = createParticleEmitterComponent({
      spawn: { type: "circle", radius: 100 },
      lifetime: { min: 0.5, max: 1 },
      velocity: {
        speedMin: 0,
        speedMax: 80,
        angleMin: 0,
        angleMax: 360,
      },
    });
    expect(particleSpawnLocalBounds(data)).toEqual({
      x: -100,
      y: -100,
      width: 200,
      height: 200,
    });
  });
});

describe("particleEmitterLocalBounds", () => {
  it("includes spawn size plus travel so content framing covers the cloud", () => {
    const data = createParticleEmitterComponent({
      spawn: { type: "circle", radius: 12 },
      lifetime: { min: 0.5, max: 1 },
      velocity: {
        speedMin: 0,
        speedMax: 80,
        angleMin: -110,
        angleMax: -70,
      },
      acceleration: { x: 0, y: 0 },
    });
    const bounds = particleEmitterLocalBounds(data);
    const spawnHalf = Math.max(12, DEFAULT_PARTICLE_POINT_BOUNDS_HALF);
    const travel = 80;
    expect(bounds.width).toBeGreaterThan(spawnHalf * 2);
    expect(bounds.height).toBeGreaterThan(spawnHalf * 2);
    expect(bounds.width).toBeGreaterThanOrEqual(spawnHalf * 2 + travel * 2);
    expect(bounds.height).toBeGreaterThanOrEqual(spawnHalf * 2 + travel * 2);
    expect(bounds.x + bounds.width / 2).toBeCloseTo(0);
    expect(bounds.y + bounds.height / 2).toBeCloseTo(0);
  });

  it("grows with acceleration over lifetime", () => {
    const still = createParticleEmitterComponent({
      spawn: { type: "point" },
      lifetime: { min: 1, max: 2 },
      velocity: {
        speedMin: 0,
        speedMax: 0,
        angleMin: 0,
        angleMax: 0,
      },
      acceleration: { x: 0, y: 0 },
    });
    const falling = createParticleEmitterComponent({
      spawn: { type: "point" },
      lifetime: { min: 1, max: 2 },
      velocity: {
        speedMin: 0,
        speedMax: 0,
        angleMin: 0,
        angleMax: 0,
      },
      acceleration: { x: 0, y: 100 },
    });
    expect(particleEmitterLocalBounds(falling).height).toBeGreaterThan(
      particleEmitterLocalBounds(still).height,
    );
  });
});
