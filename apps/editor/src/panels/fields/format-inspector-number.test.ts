import { describe, expect, it } from "vitest";
import {
  formatInspectorNumber,
  inspectorNumberUnchanged,
  resolveInspectorNumber,
} from "./format-inspector-number";

describe("formatInspectorNumber", () => {
  it("rounds to three decimals and strips trailing zeros", () => {
    expect(formatInspectorNumber(179.84298989679917)).toBe("179.843");
    expect(formatInspectorNumber(0.20299021805627784)).toBe("0.203");
    expect(formatInspectorNumber(-0.19796550230830678)).toBe("-0.198");
    expect(formatInspectorNumber(1)).toBe("1");
    expect(formatInspectorNumber(0.5)).toBe("0.5");
    expect(formatInspectorNumber(0)).toBe("0");
  });

  it("normalizes negative zero", () => {
    expect(formatInspectorNumber(-0)).toBe("0");
  });

  it("keeps non-finite values readable", () => {
    expect(formatInspectorNumber(Number.NaN)).toBe("NaN");
    expect(formatInspectorNumber(Number.POSITIVE_INFINITY)).toBe("Infinity");
  });
});

describe("inspectorNumberUnchanged", () => {
  const stored = 179.84298989679917;

  it("treats the formatted display as unchanged", () => {
    expect(inspectorNumberUnchanged("179.843", stored)).toBe(true);
  });

  it("treats the exact stored value as unchanged", () => {
    expect(inspectorNumberUnchanged(String(stored), stored)).toBe(true);
  });

  it("treats a real edit as changed", () => {
    expect(inspectorNumberUnchanged("180", stored)).toBe(false);
  });
});

describe("resolveInspectorNumber", () => {
  const stored = 179.84298989679917;

  it("keeps full precision when the display was not edited", () => {
    expect(resolveInspectorNumber("179.843", stored)).toBe(stored);
  });

  it("returns the typed number when the user edits", () => {
    expect(resolveInspectorNumber("180", stored)).toBe(180);
  });

  it("returns undefined for invalid drafts", () => {
    expect(resolveInspectorNumber("abc", stored)).toBeUndefined();
  });
});
