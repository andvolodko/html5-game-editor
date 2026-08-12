import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ProjectService } from "./project-service.js";
import { AssetDatabaseStore } from "./asset-database-store.js";
import { AssetImporterRegistry } from "./asset-importer.js";
import { GltfBundleImporter } from "./gltf-bundle-importer.js";
import { AssetImportService } from "./asset-import-service.js";

function createImportService(root: string): AssetImportService {
  const project = new ProjectService(root);
  const store = new AssetDatabaseStore(project);
  const registry = new AssetImporterRegistry();
  registry.registerBundle(new GltfBundleImporter());
  return new AssetImportService(project, store, registry);
}

describe("AssetImportService + GltfBundleImporter", () => {
  it("imports multi-file glTF with buffers and images", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "game-editor-gltf-bundle-"));
    try {
      const importer = createImportService(root);
      const gltf = Buffer.from(
        JSON.stringify({
          asset: { version: "2.0" },
          buffers: [{ uri: "mesh.bin", byteLength: 4 }],
          images: [{ uri: "mesh.png" }],
        }),
        "utf8",
      );
      const result = await importer.importFiles(
        [
          { fileName: "mesh.gltf", bytes: gltf },
          { fileName: "mesh.bin", bytes: Buffer.from([1, 2, 3, 4]) },
          { fileName: "mesh.png", bytes: Buffer.from([137, 80, 78, 71]) },
        ],
        "assets/models",
      );
      expect(result.imported).toHaveLength(1);
      expect(result.imported[0]?.type).toBe("gltf");
      expect(result.imported[0]?.metadata.kind).toBe("gltf");
      if (result.imported[0]?.metadata.kind === "gltf") {
        expect(result.imported[0].metadata.format).toBe("gltf");
        expect(result.imported[0].metadata.bufferPaths?.[0]).toContain("mesh.bin");
        expect(result.imported[0].metadata.imagePaths?.[0]).toContain("mesh.png");
      }
      const manifest = await readFile(
        path.join(root, ".project", "assets.json"),
        "utf8",
      );
      expect(manifest).toContain("mesh.gltf");
      expect(manifest).toContain("mesh.bin");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
