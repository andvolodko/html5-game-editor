import { describe, expect, it } from "vitest";
import { ValidationError } from "@game-editor/core";
import { ImportPathAllocator, importBundleFolderHint } from "./import-path-allocator.js";

describe("ImportPathAllocator", () => {
  it("preserves nested folders under the destination", () => {
    const allocator = new ImportPathAllocator("assets");
    expect(allocator.allocateRelativePath("ui/hud/health.png")).toBe(
      "assets/ui/hud/health.png",
    );
    expect(allocator.allocateRelativePath("ui/button.png")).toBe(
      "assets/ui/button.png",
    );
  });

  it("unique-ifies collisions inside the same nested folder", () => {
    const allocator = new ImportPathAllocator("assets/symbols");
    allocator.registerExistingAssetPath("assets/symbols/ui/wild.png");
    expect(allocator.allocateRelativePath("ui/wild.png")).toBe(
      "assets/symbols/ui/wild-1.png",
    );
  });

  it("does not treat the same basename in another folder as a collision", () => {
    const allocator = new ImportPathAllocator("assets");
    allocator.registerExistingAssetPath("assets/other/wild.png");
    expect(allocator.allocateRelativePath("icons/wild.png")).toBe(
      "assets/icons/wild.png",
    );
  });

  it("rejects relative paths that land in assets/scenes", () => {
    const allocator = new ImportPathAllocator("assets");
    expect(() => allocator.allocateRelativePath("scenes/hero.png")).toThrow(
      ValidationError,
    );
  });

  it("preserves nested folders for bundles", () => {
    const allocator = new ImportPathAllocator("assets");
    expect(importBundleFolderHint("characters/hero/hero.json", "hero")).toBe(
      "characters/hero",
    );
    expect(allocator.allocateUniqueFolder("characters/hero")).toBe(
      "assets/characters/hero",
    );
    expect(allocator.allocateUniqueFolder("hero")).toBe("assets/hero");
  });
});
