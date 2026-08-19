import { describe, expect, it } from "vitest";
import { seededUnitFloat } from "./seeded-unit-float.js";

describe("seededUnitFloat", () => {
  it("is deterministic for the same seed and salt", () => {
    expect(seededUnitFloat("node-a", 17)).toBe(seededUnitFloat("node-a", 17));
  });

  it("stays in [0, 1)", () => {
    const value = seededUnitFloat("node-a", 17);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });

  it("normally differs across seeds and salts", () => {
    expect(seededUnitFloat("node-a", 17)).not.toBe(seededUnitFloat("node-b", 17));
    expect(seededUnitFloat("node-a", 17)).not.toBe(seededUnitFloat("node-a", 41));
  });
});
