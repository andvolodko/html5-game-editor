import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ProjectService } from "./project-service.js";
import { AssetDatabaseStore } from "./asset-database-store.js";
import { AssetImporterRegistry } from "./asset-importer.js";
import { WebFontAssetImporter } from "./webfont-asset-importer.js";
import { AssetImportService } from "./asset-import-service.js";

function tinyFont(): Buffer {
  return Buffer.from("OTTO....webfont");
}

function createImportService(root: string): AssetImportService {
  const project = new ProjectService(root);
  const store = new AssetDatabaseStore(project);
  const registry = new AssetImporterRegistry();
  registry.register(new WebFontAssetImporter());
  return new AssetImportService(project, store, registry);
}

describe("AssetImportService + WebFontAssetImporter", () => {
  it("imports webfonts with family names from the file stem", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "game-editor-webfont-"));
    try {
      const importer = createImportService(root);

      const first = await importer.importFiles(
        [{ fileName: "ChaChicle.ttf", bytes: tinyFont() }],
        "assets/fonts/webfonts",
      );
      expect(first.imported).toHaveLength(1);
      expect(first.imported[0]?.path).toBe("assets/fonts/webfonts/ChaChicle.ttf");
      expect(first.imported[0]?.type).toBe("webfont");
      expect(first.imported[0]?.metadata.kind).toBe("webfont");
      if (first.imported[0]?.metadata.kind === "webfont") {
        expect(first.imported[0].metadata.fontFamily).toBe("ChaChicle");
        expect(first.imported[0].metadata.mimeType).toBe("font/ttf");
        expect(first.imported[0].metadata.format).toBe("ttf");
      }

      const second = await importer.importFiles(
        [{ fileName: "Dotrice-Regular.woff", bytes: tinyFont() }],
        "assets/fonts/webfonts",
      );
      expect(second.imported[0]?.metadata.kind).toBe("webfont");
      if (second.imported[0]?.metadata.kind === "webfont") {
        expect(second.imported[0].metadata.fontFamily).toBe("Dotrice Regular");
        expect(second.imported[0].metadata.format).toBe("woff");
      }

      const manifest = await readFile(
        path.join(root, ".project", "assets.json"),
        "utf8",
      );
      expect(manifest).toContain("assets/fonts/webfonts/ChaChicle.ttf");
      expect(manifest).toContain("Dotrice Regular");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects empty webfont files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "game-editor-webfont-"));
    try {
      const importer = createImportService(root);
      await expect(
        importer.importFiles([
          { fileName: "empty.woff2", bytes: Buffer.alloc(0) },
        ]),
      ).rejects.toThrow(/Empty webfont file|ASSET_IMPORT_FAILED/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
