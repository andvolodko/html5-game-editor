import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ProjectService } from "./project-service.js";
import { AssetDatabaseStore } from "./asset-database-store.js";
import { AssetImporterRegistry } from "./asset-importer.js";
import { TextureAssetImporter } from "./texture-asset-importer.js";
import { AssetImportService } from "./asset-import-service.js";

function tinyPng(): Buffer {
  // 1x1 PNG
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
}

function createImportService(root: string): AssetImportService {
  const project = new ProjectService(root);
  const store = new AssetDatabaseStore(project);
  const registry = new AssetImporterRegistry();
  registry.register(new TextureAssetImporter());
  return new AssetImportService(project, store, registry);
}

describe("AssetImportService + TextureAssetImporter", () => {
  it("imports textures with stable ids and unique duplicate names", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "game-editor-assets-"));
    try {
      const importer = createImportService(root);

      const first = await importer.importFiles(
        [{ fileName: "wild.png", bytes: tinyPng() }],
        "assets/symbols",
      );
      expect(first.imported).toHaveLength(1);
      expect(first.imported[0]?.path).toBe("assets/symbols/wild.png");
      expect(first.imported[0]?.id.startsWith("asset_")).toBe(true);
      expect(first.revision).toMatch(/^a[0-9a-f]+$/);
      expect(first.database.assets).toHaveLength(1);

      const second = await importer.importFiles(
        [{ fileName: "wild.png", bytes: tinyPng() }],
        "assets/symbols",
      );
      expect(second.imported[0]?.path).toBe("assets/symbols/wild-1.png");
      expect(second.imported[0]?.id).not.toBe(first.imported[0]?.id);
      expect(second.revision).not.toBe(first.revision);

      const manifest = await readFile(
        path.join(root, ".project", "assets.json"),
        "utf8",
      );
      expect(manifest).toContain("assets/symbols/wild.png");
      expect(manifest).toContain("assets/symbols/wild-1.png");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects unsupported extensions", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "game-editor-assets-"));
    try {
      const importer = createImportService(root);
      await expect(
        importer.importFiles([{ fileName: "notes.txt", bytes: Buffer.from("x") }]),
      ).rejects.toThrow(/Unsupported|ASSET_IMPORT_FAILED/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("imports valid files in a mixed batch without writing rejected files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "game-editor-assets-"));
    try {
      const importer = createImportService(root);
      const result = await importer.importFiles([
        { fileName: "ok.png", bytes: tinyPng() },
        { fileName: "bad.txt", bytes: Buffer.from("nope") },
      ]);
      expect(result.imported).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.fileName).toBe("bad.txt");
      expect(result.database.assets).toHaveLength(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("preserves dropped folder hierarchy", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "game-editor-assets-"));
    try {
      const importer = createImportService(root);
      const result = await importer.importFiles(
        [
          { fileName: "ui/hud/health.png", bytes: tinyPng() },
          { fileName: "ui/button.png", bytes: tinyPng() },
        ],
        "assets",
      );
      expect(result.imported.map((asset) => asset.path).sort()).toEqual([
        "assets/ui/button.png",
        "assets/ui/hud/health.png",
      ]);
      const health = await readFile(
        path.join(root, "assets", "ui", "hud", "health.png"),
      );
      expect(health.byteLength).toBeGreaterThan(0);

      const duplicate = await importer.importFiles(
        [{ fileName: "ui/button.png", bytes: tinyPng() }],
        "assets",
      );
      expect(duplicate.imported[0]?.path).toBe("assets/ui/button-1.png");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
