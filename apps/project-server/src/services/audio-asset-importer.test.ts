import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ProjectService } from "./project-service.js";
import { AssetDatabaseStore } from "./asset-database-store.js";
import { AssetImporterRegistry } from "./asset-importer.js";
import { AudioAssetImporter } from "./audio-asset-importer.js";
import { AssetImportService } from "./asset-import-service.js";

/** Minimal non-empty WAV-like payload (importer does not parse audio frames). */
function tinyAudio(): Buffer {
  return Buffer.from("RIFF....WAVEfmt ");
}

function createImportService(root: string): AssetImportService {
  const project = new ProjectService(root);
  const store = new AssetDatabaseStore(project);
  const registry = new AssetImporterRegistry();
  registry.register(new AudioAssetImporter());
  return new AssetImportService(project, store, registry);
}

describe("AssetImportService + AudioAssetImporter", () => {
  it("imports audio with stable ids and unique duplicate names", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "game-editor-audio-"));
    try {
      const importer = createImportService(root);

      const first = await importer.importFiles(
        [{ fileName: "click.mp3", bytes: tinyAudio() }],
        "assets/sfx",
      );
      expect(first.imported).toHaveLength(1);
      expect(first.imported[0]?.path).toBe("assets/sfx/click.mp3");
      expect(first.imported[0]?.type).toBe("audio");
      expect(first.imported[0]?.metadata.kind).toBe("audio");
      if (first.imported[0]?.metadata.kind === "audio") {
        expect(first.imported[0].metadata.mimeType).toBe("audio/mpeg");
      }

      const second = await importer.importFiles(
        [{ fileName: "click.mp3", bytes: tinyAudio() }],
        "assets/sfx",
      );
      expect(second.imported[0]?.path).toBe("assets/sfx/click-1.mp3");

      const manifest = await readFile(
        path.join(root, ".project", "assets.json"),
        "utf8",
      );
      expect(manifest).toContain("assets/sfx/click.mp3");
      expect(manifest).toContain("assets/sfx/click-1.mp3");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects empty audio files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "game-editor-audio-"));
    try {
      const importer = createImportService(root);
      await expect(
        importer.importFiles([
          { fileName: "empty.wav", bytes: Buffer.alloc(0) },
        ]),
      ).rejects.toThrow(/Empty audio file|ASSET_IMPORT_FAILED/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
