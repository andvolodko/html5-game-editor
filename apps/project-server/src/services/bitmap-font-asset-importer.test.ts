import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ProjectService } from "./project-service.js";
import { AssetDatabaseStore } from "./asset-database-store.js";
import { AssetImporterRegistry } from "./asset-importer.js";
import { TextureAssetImporter } from "./texture-asset-importer.js";
import { BitmapFontAssetImporter } from "./bitmap-font-asset-importer.js";
import { AssetImportService } from "./asset-import-service.js";

function tinyPng(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
}

function desyrelXml(): Buffer {
  return Buffer.from(`<font>
    <info face="Desyrel" size="70" bold="0" italic="0"/>
    <common lineHeight="87" base="61" pages="1"/>
    <pages>
        <page id="0" file="desyrel.png"/>
    </pages>
    <chars count="1">
        <char id="65" x="0" y="0" width="10" height="10" xoffset="0" yoffset="0" xadvance="10" page="0" letter="A"/>
    </chars>
</font>
`);
}

function createImportService(root: string): AssetImportService {
  const project = new ProjectService(root);
  const store = new AssetDatabaseStore(project);
  const registry = new AssetImporterRegistry();
  registry.register(new TextureAssetImporter());
  registry.registerBundle(new BitmapFontAssetImporter());
  return new AssetImportService(project, store, registry);
}

describe("AssetImportService + BitmapFontAssetImporter", () => {
  it("imports a complete bitmap font as one asset with owned files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "game-editor-font-"));
    try {
      const importer = createImportService(root);
      const result = await importer.importFiles(
        [
          { fileName: "desyrel.xml", bytes: desyrelXml() },
          { fileName: "desyrel.png", bytes: tinyPng() },
        ],
        "assets",
      );
      expect(result.imported).toHaveLength(1);
      const record = result.imported[0]!;
      expect(record.type).toBe("font");
      expect(record.path).toBe("assets/desyrel/desyrel.xml");
      expect(record.metadata.kind).toBe("font");
      if (record.metadata.kind === "font") {
        expect(record.metadata.fontFamily).toBe("Desyrel");
        expect(record.metadata.pagePaths).toEqual(["assets/desyrel/desyrel.png"]);
      }
      const xml = await readFile(
        path.join(root, "assets", "desyrel", "desyrel.xml"),
        "utf8",
      );
      expect(xml).toContain('face="Desyrel"');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects an incomplete font set and still imports leftover textures", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "game-editor-font-"));
    try {
      const importer = createImportService(root);
      const result = await importer.importFiles([
        { fileName: "desyrel.xml", bytes: desyrelXml() },
        { fileName: "orphan.png", bytes: tinyPng() },
      ]);
      expect(result.imported).toHaveLength(1);
      expect(result.imported[0]?.type).toBe("texture");
      expect(result.imported[0]?.path).toBe("assets/orphan.png");
      expect(
        result.errors.some((error) => /missing desyrel\.png/.test(error.message)),
      ).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("preserves dropped folder hierarchy for a bitmap font", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "game-editor-font-"));
    try {
      const importer = createImportService(root);
      const result = await importer.importFiles(
        [
          {
            fileName: "fonts/bitmap-font-desyrel/desyrel.xml",
            bytes: desyrelXml(),
          },
          {
            fileName: "fonts/bitmap-font-desyrel/desyrel.png",
            bytes: tinyPng(),
          },
        ],
        "assets",
      );
      expect(result.imported).toHaveLength(1);
      expect(result.imported[0]?.path).toBe(
        "assets/fonts/bitmap-font-desyrel/desyrel.xml",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
