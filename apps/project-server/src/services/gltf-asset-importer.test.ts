import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ProjectService } from "./project-service.js";
import { AssetDatabaseStore } from "./asset-database-store.js";
import { AssetImporterRegistry } from "./asset-importer.js";
import { GltfAssetImporter } from "./gltf-asset-importer.js";
import { AssetImportService } from "./asset-import-service.js";

/** Minimal valid GLB with optional animation names in the JSON chunk. */
function tinyGlb(animations: Array<{ name?: string }> = []): Buffer {
  const json = JSON.stringify({
    asset: { version: "2.0" },
    ...(animations.length > 0 ? { animations } : {}),
  });
  const jsonBytes = Buffer.from(json, "utf8");
  const paddedLength = Math.ceil(jsonBytes.length / 4) * 4;
  const totalLength = 12 + 8 + paddedLength;
  const buffer = Buffer.alloc(totalLength, 0x20);
  buffer.writeUInt32LE(0x46546c67, 0);
  buffer.writeUInt32LE(2, 4);
  buffer.writeUInt32LE(totalLength, 8);
  buffer.writeUInt32LE(paddedLength, 12);
  buffer.writeUInt32LE(0x4e4f534a, 16);
  jsonBytes.copy(buffer, 20);
  return buffer;
}

function createImportService(root: string): AssetImportService {
  const project = new ProjectService(root);
  const store = new AssetDatabaseStore(project);
  const registry = new AssetImporterRegistry();
  registry.register(new GltfAssetImporter());
  return new AssetImportService(project, store, registry);
}

describe("AssetImportService + GltfAssetImporter", () => {
  it("imports GLB with stable ids and unique duplicate names", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "game-editor-gltf-"));
    try {
      const importer = createImportService(root);

      const first = await importer.importFiles(
        [{ fileName: "hero.glb", bytes: tinyGlb([{ name: "idle" }, { name: "walk" }]) }],
        "assets/models",
      );
      expect(first.imported).toHaveLength(1);
      expect(first.imported[0]?.path).toBe("assets/models/hero.glb");
      expect(first.imported[0]?.type).toBe("gltf");
      expect(first.imported[0]?.metadata.kind).toBe("gltf");
      if (first.imported[0]?.metadata.kind === "gltf") {
        expect(first.imported[0].metadata.format).toBe("glb");
        expect(first.imported[0].metadata.mimeType).toBe("model/gltf-binary");
        expect(first.imported[0].metadata.animations).toEqual(["idle", "walk"]);
      }

      const second = await importer.importFiles(
        [{ fileName: "hero.glb", bytes: tinyGlb() }],
        "assets/models",
      );
      expect(second.imported[0]?.path).toBe("assets/models/hero-1.glb");
      if (second.imported[0]?.metadata.kind === "gltf") {
        expect(second.imported[0].metadata.animations).toEqual([]);
      }

      const manifest = await readFile(
        path.join(root, ".project", "assets.json"),
        "utf8",
      );
      expect(manifest).toContain("assets/models/hero.glb");
      expect(manifest).toContain("assets/models/hero-1.glb");
      expect(manifest).toContain("idle");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects empty GLB files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "game-editor-gltf-"));
    try {
      const importer = createImportService(root);
      await expect(
        importer.importFiles([
          { fileName: "empty.glb", bytes: Buffer.alloc(0) },
        ]),
      ).rejects.toThrow(/Empty glTF file|ASSET_IMPORT_FAILED/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects invalid GLB containers", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "game-editor-gltf-"));
    try {
      const importer = createImportService(root);
      await expect(
        importer.importFiles([
          { fileName: "bad.glb", bytes: Buffer.from("not-a-glb") },
        ]),
      ).rejects.toThrow(/Invalid GLB|ASSET_IMPORT_FAILED/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
