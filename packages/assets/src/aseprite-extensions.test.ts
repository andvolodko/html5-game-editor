import { describe, expect, it } from "vitest";
import {
  createAsepriteAssetRecord,
  derivedAsepritePaths,
  firstAsepriteAnimation,
  generatedAsepriteOutputPaths,
  isAsepriteAnimated,
  isSupportedAsepriteExtension,
  ownedAssetPaths,
  relocateOwnedAssetPaths,
  resolveAsepritePartRelativePath,
  toPublicAssetPath,
  toDiskAssetPath,
} from "./index.js";

describe("aseprite extensions", () => {
  it("detects .aseprite and .ase, not png", () => {
    expect(isSupportedAsepriteExtension("hero.aseprite")).toBe(true);
    expect(isSupportedAsepriteExtension("hero.ASE")).toBe(true);
    expect(isSupportedAsepriteExtension("hero.png")).toBe(false);
  });

  it("mirrors source paths under .generated/", () => {
    expect(generatedAsepriteOutputPaths("assets/characters/hero.aseprite")).toEqual({
      sheetPath: ".generated/assets/characters/hero.png",
      dataPath: ".generated/assets/characters/hero.json",
    });
  });

  it("maps on-disk .generated paths to public _generated/ URLs", () => {
    expect(toPublicAssetPath(".generated/assets/hero.json")).toBe(
      "_generated/assets/hero.json",
    );
    expect(toPublicAssetPath("assets/ui/hero.png")).toBe("assets/ui/hero.png");
    expect(toDiskAssetPath("_generated/assets/hero.json")).toBe(
      ".generated/assets/hero.json",
    );
    expect(toDiskAssetPath(".generated/assets/hero.json")).toBe(
      ".generated/assets/hero.json",
    );
  });

  it("treats generated files as derived, not owned source paths", () => {
    const record = createAsepriteAssetRecord({
      id: "asset_hero",
      name: "hero",
      path: "assets/characters/hero.aseprite",
      frameCount: 4,
      tags: [{ name: "idle", from: 0, to: 1 }],
    });
    expect(ownedAssetPaths(record)).toEqual(["assets/characters/hero.aseprite"]);
    expect(derivedAsepritePaths(record)).toEqual([
      ".generated/assets/characters/hero.png",
      ".generated/assets/characters/hero.json",
    ]);
  });

  it("relocates generated paths when the source folder moves", () => {
    const record = createAsepriteAssetRecord({
      id: "asset_hero",
      name: "hero",
      path: "assets/characters/hero.aseprite",
    });
    const moved = relocateOwnedAssetPaths(record, "assets/characters", "assets/heroes");
    expect(moved.path).toBe("assets/heroes/hero.aseprite");
    expect(moved.metadata.kind).toBe("aseprite");
    if (moved.metadata.kind === "aseprite") {
      expect(moved.metadata.sheetPath).toBe(".generated/assets/heroes/hero.png");
      expect(moved.metadata.dataPath).toBe(".generated/assets/heroes/hero.json");
    }
  });

  it("resolves allowlisted generated part basenames", () => {
    const record = createAsepriteAssetRecord({
      id: "asset_hero",
      name: "hero",
      path: "assets/hero.aseprite",
    });
    expect(resolveAsepritePartRelativePath(record, "hero.png")).toBe(
      ".generated/assets/hero.png",
    );
    expect(resolveAsepritePartRelativePath(record, "hero.json")).toBe(
      ".generated/assets/hero.json",
    );
    expect(resolveAsepritePartRelativePath(record, "../secret.json")).toBeUndefined();
  });

  it("classifies animated vs static from metadata", () => {
    const animated = createAsepriteAssetRecord({
      name: "hero",
      path: "assets/hero.aseprite",
      frameCount: 4,
      tags: [{ name: "idle", from: 0, to: 1 }, { name: "run", from: 2, to: 3 }],
    });
    const still = createAsepriteAssetRecord({
      name: "icon",
      path: "assets/icon.aseprite",
      frameCount: 1,
    });
    expect(animated.metadata.kind).toBe("aseprite");
    if (animated.metadata.kind === "aseprite") {
      expect(isAsepriteAnimated(animated.metadata)).toBe(true);
      expect(firstAsepriteAnimation(animated.metadata)).toBe("idle");
    }
    expect(still.metadata.kind).toBe("aseprite");
    if (still.metadata.kind === "aseprite") {
      expect(isAsepriteAnimated(still.metadata)).toBe(false);
      expect(firstAsepriteAnimation(still.metadata)).toBeUndefined();
    }
  });
});
