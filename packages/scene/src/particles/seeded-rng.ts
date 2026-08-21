/**
 * Mulberry32 stream PRNG. Prefer this over one-shot `seededUnitFloat` when
 * spawning many particles from one emitter seed.
 */
export interface SeededRng {
  /** Next unit float in [0, 1). */
  next(): number;
  /** Inclusive integer range [min, max]. */
  nextInt(min: number, max: number): number;
  /** Inclusive float range [min, max]. */
  nextRange(min: number, max: number): number;
}

const UNSIGNED_32 = 0x1_0000_0000;

export function createSeededRng(seed: number): SeededRng {
  let state = seed >>> 0;

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UNSIGNED_32;
  }

  return {
    next,
    nextInt(min: number, max: number): number {
      if (max <= min) {
        return min;
      }
      return min + Math.floor(next() * (max - min + 1));
    },
    nextRange(min: number, max: number): number {
      if (max <= min) {
        return min;
      }
      return min + next() * (max - min);
    },
  };
}
