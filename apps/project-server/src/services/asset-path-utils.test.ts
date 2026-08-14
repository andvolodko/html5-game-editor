import { describe, expect, it } from "vitest";
import {
  allocateUniqueFileName,
  normalizeAssetDestination,
  sanitizeImportFileRelativePath,
  sanitizeImportFolderPath,
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

  it("strips traversal and normalizes slashes in dropped relative paths", () => {
    expect(sanitizeImportFileRelativePath("ui\\hud\\health.png")).toBe(
      "ui/hud/health.png",
    );
    expect(sanitizeImportFileRelativePath("../secret.png")).toBe("secret.png");
    expect(sanitizeImportFileRelativePath("ui/./a.png")).toBe("ui/a.png");
    expect(sanitizeImportFolderPath("characters/hero")).toBe("characters/hero");
    expect(sanitizeImportFileRelativePath("bad!/hero.png")).toBe("bad/hero.png");
  });
});
