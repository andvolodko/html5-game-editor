import { describe, expect, it } from "vitest";
import {
  isSpineAtlasFile,
  isSpineImportFile,
  isSpineSkeletonJson,
  parseAtlasPageNames,
  parseSpineSkeletonMeta,
  relocateOwnedAssetPaths,
  resolveSpinePartRelativePath,
  ownedAssetPaths,
  spineBundleFolder,
  isAllowedSpinePartName,
} from "./spine-extensions.js";
import { createSpineAssetRecord } from "./factories.js";

const ATLAS = `hero.png
size: 1,1
format: RGBA8888
filter: Linear,Linear
repeat: none
root
  rotate: false
  xy: 0, 0
  size: 1, 1
`;

describe("spine extensions", () => {
  it("detects atlas and import files", () => {
    expect(isSpineAtlasFile("hero.atlas")).toBe(true);
    expect(isSpineAtlasFile("hero.png")).toBe(false);
    expect(isSpineImportFile({ name: "hero.json" })).toBe(true);
    expect(isSpineImportFile({ name: "hero.skel" })).toBe(true);
    expect(isSpineImportFile({ name: "hero.png" })).toBe(false);
  });

  it("recognizes spine skeleton JSON", () => {
    expect(
      isSpineSkeletonJson({
        skeleton: { spine: "4.2" },
        bones: [{ name: "root" }],
        skins: [{ name: "default" }],
        animations: { idle: {} },
      }),
    ).toBe(true);
    expect(isSpineSkeletonJson({ foo: 1 })).toBe(false);
  });

  it("parses skins, animations, and atlas pages", () => {
    expect(
      parseSpineSkeletonMeta({
        skins: [{ name: "default" }, { name: "alt" }],
        animations: { idle: {}, walk: {} },
      }),
    ).toEqual({ skins: ["default", "alt"], animations: ["idle", "walk"] });
    expect(parseAtlasPageNames(ATLAS)).toEqual(["hero.png"]);
  });

  it("relocates owned bundle paths and resolves allowlisted parts", () => {
    const record = createSpineAssetRecord({
      id: "asset_spine",
      name: "hero",
      path: "assets/hero/hero.json",
      skeletonFormat: "json",
      atlasPath: "assets/hero/hero.atlas",
      pagePaths: ["assets/hero/hero.png"],
      skins: ["default"],
      animations: ["idle"],
    });
    expect(ownedAssetPaths(record)).toEqual([
      "assets/hero/hero.json",
      "assets/hero/hero.atlas",
      "assets/hero/hero.png",
    ]);
    expect(spineBundleFolder(record)).toBe("assets/hero");
    const moved = relocateOwnedAssetPaths(record, "assets/hero", "assets/warrior");
    expect(moved.path).toBe("assets/warrior/hero.json");
    expect(moved.metadata.kind === "spine" && moved.metadata.atlasPath).toBe(
      "assets/warrior/hero.atlas",
    );
    expect(resolveSpinePartRelativePath(record, "hero.atlas")).toBe(
      "assets/hero/hero.atlas",
    );
    expect(resolveSpinePartRelativePath(record, "hero.json")).toBeUndefined();
    expect(resolveSpinePartRelativePath(record, "../secret")).toBeUndefined();
    expect(isAllowedSpinePartName("hero.png")).toBe(true);
    expect(isAllowedSpinePartName("..")).toBe(false);
  });
});
