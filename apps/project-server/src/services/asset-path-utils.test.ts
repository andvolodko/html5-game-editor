import { describe, expect, it } from "vitest";
import {
  allocateUniqueFileName,
  normalizeAssetDestination,
} from "./asset-path-utils.js";

describe("asset path utils", () => {
  it("allocates unique filenames without overwriting", () => {
    const existing = new Set(["wild.png"]);
    expect(allocateUniqueFileName("wild.png", existing)).toBe("wild-1.png");
    existing.add("wild-1.png");
    expect(allocateUniqueFileName("wild.png", existing)).toBe("wild-2.png");
  });

  it("normalizes destinations under assets/", () => {
    expect(normalizeAssetDestination(undefined)).toBe("assets");
    expect(normalizeAssetDestination("symbols")).toBe("assets/symbols");
    expect(normalizeAssetDestination("assets/symbols")).toBe("assets/symbols");
    expect(normalizeAssetDestination("../secret")).toBe("assets/secret");
  });
});
