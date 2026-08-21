import { describe, expect, it } from "vitest";
import { createParticleEmitterComponent } from "../factories/particle-emitter.js";
import { ParticleSimulation } from "./particle-simulation.js";
import { createSeededRng } from "./seeded-rng.js";

describe("createSeededRng", () => {
  it("is deterministic for the same seed", () => {
    const a = createSeededRng(123);
    const b = createSeededRng(123);
    expect([a.next(), a.next(), a.next()]).toEqual([
      b.next(),
      b.next(),
      b.next(),
    ]);
  });
});

describe("ParticleSimulation", () => {
  it("emits approximately rate * time particles", () => {
    const config = createParticleEmitterComponent({
      playOnStart: true,
      loop: true,
      prewarm: false,
      emission: { rate: 50, maxParticles: 500 },
      lifetime: { min: 10, max: 10 },
    });
    const sim = new ParticleSimulation(config);
    const steps = 20;
    const dt = 0.05;
    for (let i = 0; i < steps; i += 1) {
      sim.update(dt);
    }
    const expected = 50 * steps * dt;
    const alive = sim.getStats().alive;
    expect(alive).toBeGreaterThanOrEqual(Math.floor(expected * 0.85));
    expect(alive).toBeLessThanOrEqual(Math.ceil(expected * 1.15) + 1);
  });

  it("expires particles after lifetime", () => {
    const config = createParticleEmitterComponent({
      playOnStart: true,
      loop: true,
      prewarm: false,
      emission: { rate: 100, maxParticles: 200 },
      lifetime: { min: 0.2, max: 0.2 },
    });
    const sim = new ParticleSimulation(config);
    for (let i = 0; i < 10; i += 1) {
      sim.update(0.05);
    }
    expect(sim.getStats().alive).toBeGreaterThan(0);
    for (let i = 0; i < 20; i += 1) {
      sim.update(0.05);
    }
    // After emission pause via stop — clear and verify expire path
    sim.stop();
    expect(sim.getStats().alive).toBe(0);

    const short = new ParticleSimulation(
      createParticleEmitterComponent({
        playOnStart: true,
        prewarm: false,
        emission: { rate: 40, maxParticles: 40 },
        lifetime: { min: 0.1, max: 0.1 },
      }),
    );
    short.update(0.05);
    const mid = short.getStats().alive;
    expect(mid).toBeGreaterThan(0);
    short.setConfig(
      createParticleEmitterComponent({
        playOnStart: true,
        prewarm: false,
        emission: { rate: 0, maxParticles: 40 },
        lifetime: { min: 0.1, max: 0.1 },
      }),
    );
    short.update(0.2);
    expect(short.getStats().alive).toBe(0);
  });

  it("produces identical state for same seed, config, and timesteps", () => {
    const make = () =>
      new ParticleSimulation(
        createParticleEmitterComponent({
          seed: 99,
          playOnStart: true,
          prewarm: false,
          emission: { rate: 30, maxParticles: 100 },
          lifetime: { min: 1, max: 1.5 },
        }),
      );
    const a = make();
    const b = make();
    for (let i = 0; i < 15; i += 1) {
      a.update(1 / 60);
      b.update(1 / 60);
    }
    const pa = a.getParticles().filter((p) => p.alive);
    const pb = b.getParticles().filter((p) => p.alive);
    expect(pa.length).toBe(pb.length);
    for (let i = 0; i < pa.length; i += 1) {
      expect(pa[i]!.x).toBeCloseTo(pb[i]!.x, 5);
      expect(pa[i]!.y).toBeCloseTo(pb[i]!.y, 5);
      expect(pa[i]!.age).toBeCloseTo(pb[i]!.age, 5);
      expect(pa[i]!.color).toBe(pb[i]!.color);
    }
  });

  it("restart resets to the same initial pattern", () => {
    const sim = new ParticleSimulation(
      createParticleEmitterComponent({
        seed: 7,
        playOnStart: true,
        prewarm: false,
        emission: { rate: 20, maxParticles: 50 },
      }),
    );
    for (let i = 0; i < 10; i += 1) {
      sim.update(0.05);
    }
    const first = sim
      .getParticles()
      .filter((p) => p.alive)
      .map((p) => ({ x: p.x, y: p.y, age: p.age }));
    sim.restart();
    for (let i = 0; i < 10; i += 1) {
      sim.update(0.05);
    }
    const second = sim
      .getParticles()
      .filter((p) => p.alive)
      .map((p) => ({ x: p.x, y: p.y, age: p.age }));
    expect(second).toEqual(first);
  });

  it("restarts when spawn volume changes so the new shape is visible immediately", () => {
    const sim = new ParticleSimulation(
      createParticleEmitterComponent({
        seed: 3,
        playOnStart: true,
        prewarm: false,
        emission: { rate: 80, maxParticles: 80 },
        lifetime: { min: 10, max: 10 },
        velocity: {
          speedMin: 0,
          speedMax: 0,
          angleMin: 0,
          angleMax: 0,
        },
        spawn: { type: "rectangle", width: 200, height: 200 },
      }),
    );
    for (let i = 0; i < 20; i += 1) {
      sim.update(0.05);
    }
    expect(sim.getStats().alive).toBeGreaterThan(0);
    sim.setConfig(
      createParticleEmitterComponent({
        seed: 3,
        playOnStart: true,
        prewarm: false,
        emission: { rate: 80, maxParticles: 80 },
        lifetime: { min: 10, max: 10 },
        velocity: {
          speedMin: 0,
          speedMax: 0,
          angleMin: 0,
          angleMax: 0,
        },
        spawn: { type: "circle", radius: 40 },
      }),
    );
    expect(sim.getStats().alive).toBe(0);
    for (let i = 0; i < 20; i += 1) {
      sim.update(0.05);
    }
    const live = sim.getParticles().filter((p) => p.alive);
    expect(live.length).toBeGreaterThan(0);
    for (const p of live) {
      expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(40 + 1e-6);
    }
  });
});
