import type { ParticleSpawnShape } from "../particle-emitter-data.js";
import type { SeededRng } from "./seeded-rng.js";

const TWO_PI = Math.PI * 2;

/** Local-space birth position from the authored spawn volume. */
export function sampleParticleSpawn(
  spawn: ParticleSpawnShape,
  rng: SeededRng,
): { x: number; y: number } {
  if (spawn.type === "circle") {
    const radius = Math.max(0, spawn.radius);
    const angle = rng.next() * TWO_PI;
    const r = Math.sqrt(rng.next()) * radius;
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
  }
  if (spawn.type === "rectangle") {
    return {
      x: (rng.next() - 0.5) * spawn.width,
      y: (rng.next() - 0.5) * spawn.height,
    };
  }
  return { x: 0, y: 0 };
}
