import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createTextureAssetRecord,
  createSpineAssetRecord,
  AssetDatabase,
} from "@game-editor/assets";
import { ProjectService } from "./project-service.js";
import { AssetDatabaseStore } from "./asset-database-store.js";
import { AssetImporterRegistry } from "./asset-importer.js";
import { TextureAssetImporter } from "./texture-asset-importer.js";
import { SpineAssetImporter } from "./spine-asset-importer.js";
import { AssetSyncService } from "./asset-sync-service.js";

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
      animations: { idle: {} },
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

describe("AssetSyncService", () => {
  let root = "";
  let store: AssetDatabaseStore;
  let sync: AssetSyncService;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "game-editor-asset-sync-"));
    await mkdir(path.join(root, "assets"), { recursive: true });
    const project = new ProjectService(root);
    store = new AssetDatabaseStore(project);
    const registry = new AssetImporterRegistry();
    registry.register(new TextureAssetImporter());
    registry.registerBundle(new SpineAssetImporter());
    sync = new AssetSyncService(project, store, registry);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("removes manifest records whose files are missing", async () => {
    const record = createTextureAssetRecord({
      id: "asset_missing",
      name: "gone",
      path: "assets/gone.png",
      width: 1,
      height: 1,
      mimeType: "image/png",
    });
    const db = new AssetDatabase();
    db.add(record);
    await store.save(db);

    const result = await sync.reconcile();
    expect(result.changed).toBe(true);
    expect(result.removedIds).toEqual(["asset_missing"]);
    expect(result.database.assets).toEqual([]);
    expect((await store.load()).getAll()).toHaveLength(0);
  });

  it("discovers a new texture already on disk", async () => {
    await writeFile(path.join(root, "assets", "wild.png"), tinyPng());

    const result = await sync.reconcile();
    expect(result.changed).toBe(true);
    expect(result.discovered).toHaveLength(1);
    expect(result.discovered[0]?.type).toBe("texture");
    expect(result.discovered[0]?.path).toBe("assets/wild.png");
    expect(result.database.assets).toHaveLength(1);
  });

  it("discovers a spine bundle in place without relocating files", async () => {
    const folder = path.join(root, "assets", "hero");
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, "hero.json"), spineJson());
    await writeFile(path.join(folder, "hero.atlas"), spineAtlas());
    await writeFile(path.join(folder, "hero.png"), tinyPng());

    const result = await sync.reconcile();
    expect(result.discovered).toHaveLength(1);
    const record = result.discovered[0]!;
    expect(record.type).toBe("spine");
    expect(record.path).toBe("assets/hero/hero.json");
    if (record.metadata.kind === "spine") {
      expect(record.metadata.atlasPath).toBe("assets/hero/hero.atlas");
      expect(record.metadata.pagePaths).toEqual(["assets/hero/hero.png"]);
    }
  });

  it("ignores scene files under assets/scenes", async () => {
    await mkdir(path.join(root, "assets", "scenes"), { recursive: true });
    await writeFile(
      path.join(root, "assets", "scenes", "main.json"),
      JSON.stringify({ version: 1 }),
    );
    await writeFile(path.join(root, "assets", "ui.png"), tinyPng());

    const result = await sync.reconcile();
    expect(result.discovered.map((a) => a.path)).toEqual(["assets/ui.png"]);
  });

  it("is a no-op when disk and manifest already match", async () => {
    await writeFile(path.join(root, "assets", "ok.png"), tinyPng());
    const first = await sync.reconcile();
    expect(first.changed).toBe(true);

    const second = await sync.reconcile();
    expect(second.changed).toBe(false);
    expect(second.removedIds).toEqual([]);
    expect(second.discovered).toEqual([]);
    expect(second.revision).toBe(first.revision);
  });

  it("removes a spine record when any owned file is missing", async () => {
    const folder = path.join(root, "assets", "hero");
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, "hero.json"), spineJson());
    // atlas + page intentionally missing

    const record = createSpineAssetRecord({
      id: "asset_spine_broken",
      name: "hero",
      path: "assets/hero/hero.json",
      skeletonFormat: "json",
      atlasPath: "assets/hero/hero.atlas",
      pagePaths: ["assets/hero/hero.png"],
    });
    const db = new AssetDatabase();
    db.add(record);
    await store.save(db);

    const result = await sync.reconcile();
    expect(result.removedIds).toEqual(["asset_spine_broken"]);
    // incomplete set is not re-discovered as spine or texture
    expect(result.database.assets).toEqual([]);
  });
});
