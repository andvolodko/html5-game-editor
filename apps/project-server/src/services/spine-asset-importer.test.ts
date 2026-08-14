import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ProjectService } from "./project-service.js";
import { AssetDatabaseStore } from "./asset-database-store.js";
import { AssetImporterRegistry } from "./asset-importer.js";
import { TextureAssetImporter } from "./texture-asset-importer.js";
import { SpineAssetImporter } from "./spine-asset-importer.js";
import { AssetImportService } from "./asset-import-service.js";

function tinyPng(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
}

function spineJson(): Buffer {
  return Buffer.from(
    JSON.stringify({
      skeleton: { spine: "4.2.0" },
      bones: [{ name: "root" }],
      slots: [],
      skins: [{ name: "default" }],
      animations: { idle: {}, walk: {} },
    }),
  );
}

function spineAtlas(): Buffer {
  return Buffer.from(`hero.png
size: 1,1
format: RGBA8888
filter: Linear,Linear
repeat: none
root
  rotate: false
  xy: 0, 0
  size: 1, 1
`);
}

function createImportService(root: string): AssetImportService {
  const project = new ProjectService(root);
  const store = new AssetDatabaseStore(project);
  const registry = new AssetImporterRegistry();
  registry.register(new TextureAssetImporter());
  registry.registerBundle(new SpineAssetImporter());
  return new AssetImportService(project, store, registry);
}

describe("AssetImportService + SpineAssetImporter", () => {
  it("imports a complete spine set as one asset with owned files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "game-editor-spine-"));
    try {
      const importer = createImportService(root);
      const result = await importer.importFiles(
        [
          { fileName: "hero.json", bytes: spineJson() },
          { fileName: "hero.atlas", bytes: spineAtlas() },
          { fileName: "hero.png", bytes: tinyPng() },
        ],
        "assets",
      );
      expect(result.imported).toHaveLength(1);
      const record = result.imported[0]!;
      expect(record.type).toBe("spine");
      expect(record.path).toBe("assets/hero/hero.json");
      expect(record.metadata.kind).toBe("spine");
      if (record.metadata.kind === "spine") {
        expect(record.metadata.atlasPath).toBe("assets/hero/hero.atlas");
        expect(record.metadata.pagePaths).toEqual(["assets/hero/hero.png"]);
        expect(record.metadata.skins).toEqual(["default"]);
        expect(record.metadata.animations).toEqual(["idle", "walk"]);
      }
      const json = await readFile(path.join(root, "assets", "hero", "hero.json"), "utf8");
      expect(json).toContain("idle");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects an incomplete spine set and still imports leftover textures", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "game-editor-spine-"));
    try {
      const importer = createImportService(root);
      const result = await importer.importFiles([
        { fileName: "hero.json", bytes: spineJson() },
        { fileName: "orphan.png", bytes: tinyPng() },
      ]);
      expect(result.imported).toHaveLength(1);
      expect(result.imported[0]?.type).toBe("texture");
      expect(result.imported[0]?.path).toBe("assets/orphan.png");
      expect(result.errors.some((error) => /missing hero\.atlas/.test(error.message))).toBe(
        true,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails when only an incomplete spine set is dropped", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "game-editor-spine-"));
    try {
      const importer = createImportService(root);
      await expect(
        importer.importFiles([
          { fileName: "hero.json", bytes: spineJson() },
          { fileName: "hero.atlas", bytes: spineAtlas() },
        ]),
      ).rejects.toThrow(/missing hero\.png|ASSET_IMPORT_FAILED/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("preserves dropped folder hierarchy for a spine set", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "game-editor-spine-"));
    try {
      const importer = createImportService(root);
      const result = await importer.importFiles(
        [
          { fileName: "characters/hero/hero.json", bytes: spineJson() },
          { fileName: "characters/hero/hero.atlas", bytes: spineAtlas() },
          { fileName: "characters/hero/hero.png", bytes: tinyPng() },
        ],
        "assets",
      );
      expect(result.imported).toHaveLength(1);
      expect(result.imported[0]?.path).toBe("assets/characters/hero/hero.json");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
