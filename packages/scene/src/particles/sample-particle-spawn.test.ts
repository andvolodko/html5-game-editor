import { describe, expect, it } from "vitest";
import { createSeededRng } from "./seeded-rng.js";
import { sampleParticleSpawn } from "./sample-particle-spawn.js";

const SAMPLES = 400;

describe("sampleParticleSpawn", () => {
  it("keeps circle samples inside the disk, not the bounding square corners", () => {
    const rng = createSeededRng(7);
    const radius = 100;
    let outsideDisk = 0;
    let inSquareCorner = 0;
    let nearEdge = 0;
    for (let i = 0; i < SAMPLES; i += 1) {
      const p = sampleParticleSpawn({ type: "circle", radius }, rng);
      const hypot = Math.hypot(p.x, p.y);
      if (hypot > radius + 1e-6) {
        outsideDisk += 1;
      }
      if (hypot > radius * 0.7) {
        nearEdge += 1;
      }
      if (Math.abs(p.x) > radius * 0.75 && Math.abs(p.y) > radius * 0.75) {
        inSquareCorner += 1;
      }
    }
    expect(outsideDisk).toBe(0);
    expect(nearEdge).toBeGreaterThan(0);
    expect(inSquareCorner).toBe(0);
  });

  it("fills rectangle corners that a circle of the same half-extent would exclude", () => {
    const rng = createSeededRng(7);
    const half = 100;
    let inCorner = 0;
    for (let i = 0; i < SAMPLES; i += 1) {
      const p = sampleParticleSpawn(
        { type: "rectangle", width: half * 2, height: half * 2 },
        rng,
      );
      if (Math.abs(p.x) > half * 0.75 && Math.abs(p.y) > half * 0.75) {
        inCorner += 1;
      }
    }
    expect(inCorner).toBeGreaterThan(0);
  });
});
