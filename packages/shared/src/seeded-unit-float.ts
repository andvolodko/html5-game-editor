const HASH_MULTIPLIER = 31;
const UNSIGNED_32_RANGE = 0x1_0000_0000;

/**
 * Deterministic unit float in `[0, 1)` from a string seed and numeric salt.
 * No global RNG state; cheap; no allocations.
 */
export function seededUnitFloat(seed: string, salt = 0): number {
  let hash = salt;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * HASH_MULTIPLIER + seed.charCodeAt(i)) | 0;
  }
  return (hash >>> 0) / UNSIGNED_32_RANGE;
}
