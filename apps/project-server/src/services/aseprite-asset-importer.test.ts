import { describe, expect, it } from "vitest";
import { AsepriteAssetImporter } from "./aseprite-asset-importer.js";
import { TextureAssetImporter } from "./texture-asset-importer.js";

describe("AsepriteAssetImporter", () => {
  const importer = new AsepriteAssetImporter();
  const textures = new TextureAssetImporter();

  it("supports .aseprite and not png", () => {
    expect(
      importer.supports({ fileName: "hero.aseprite", bytes: Buffer.from("x") }),
    ).toBe(true);
    expect(
      importer.supports({ fileName: "hero.ase", bytes: Buffer.from("x") }),
    ).toBe(true);
    expect(
      importer.supports({ fileName: "hero.png", bytes: Buffer.from("x") }),
    ).toBe(false);
    expect(
      textures.supports({ fileName: "hero.aseprite", bytes: Buffer.from("x") }),
    ).toBe(false);
  });

  it("prepares a source record whose path is the .aseprite file", async () => {
    const prepared = await importer.prepare(
      { fileName: "hero.aseprite", bytes: Buffer.from("ase-bytes") },
      {
        destinationFolder: "assets/characters",
        allocateRelativePath: (name) => `assets/characters/${name}`,
        allocateUniqueFolder: (name) => `assets/characters/${name}`,
      },
    );
    expect(prepared.record.type).toBe("aseprite");
    expect(prepared.record.path).toBe("assets/characters/hero.aseprite");
    expect(prepared.files).toEqual([
      { relativePath: "assets/characters/hero.aseprite", bytes: Buffer.from("ase-bytes") },
    ]);
    expect(prepared.record.metadata.kind).toBe("aseprite");
    if (prepared.record.metadata.kind === "aseprite") {
      expect(prepared.record.metadata.sheetPath).toBe(
        ".generated/assets/characters/hero.png",
      );
      expect(prepared.record.metadata.dataPath).toBe(
        ".generated/assets/characters/hero.json",
      );
    }
  });
});
