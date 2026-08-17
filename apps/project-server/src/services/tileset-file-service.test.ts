import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createTextureAssetRecord } from "@game-editor/assets";
import { ProjectService } from "./project-service.js";
import { AssetDatabaseStore } from "./asset-database-store.js";
import { TileSetFileService } from "./tileset-file-service.js";

describe("TileSetFileService", () => {
  let root: string | undefined;

  afterEach(async () => {
    if (root) {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("creates, loads, and saves a TileSet beside the source texture", async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "tileset-service-"));
    const projectService = new ProjectService(root);
    const store = new AssetDatabaseStore(projectService);
    const database = await store.load();
    const texture = createTextureAssetRecord({
      id: "asset_grass",
      name: "Grass",
      path: "assets/tiles/Grass.png",
      width: 64,
      height: 32,
      mimeType: "image/png",
    });
    database.add(texture);
    await store.save(database);
    const service = new TileSetFileService(projectService, store);

    const created = await service.createTileSet({
      name: "Grass TileSet",
      imageAssetId: texture.id,
      destination: "assets/tiles/Grass.tileset.json",
    });
    expect(created.asset.type).toBe("tileset");
    expect(created.asset.path).toBe("assets/tiles/Grass.tileset.json");
    expect(created.tileset.columns).toBe(2);
    expect(created.tileset.rows).toBe(1);
    const written = await readFile(
      path.join(root, "assets/tiles/Grass.tileset.json"),
      "utf8",
    );
    expect(written).toContain("\"imageAssetId\": \"asset_grass\"");

    const loaded = await service.loadTileSet(created.asset.id);
    expect(loaded.name).toBe("Grass TileSet");
    loaded.tileWidth = 16;
    loaded.tileHeight = 16;
    loaded.columns = 4;
    loaded.rows = 2;
    const saved = await service.saveTileSet(created.asset.id, loaded);
    expect(saved.tileWidth).toBe(16);
    expect(saved.columns).toBe(4);
  });

  it("persists tile animation metadata onto catalogue records", async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "tileset-service-"));
    const projectService = new ProjectService(root);
    const store = new AssetDatabaseStore(projectService);
    const database = await store.load();
    const texture = createTextureAssetRecord({
      id: "asset_water",
      name: "Water",
      path: "assets/tiles/Water.png",
      width: 128,
      height: 32,
      mimeType: "image/png",
    });
    database.add(texture);
    await store.save(database);
    const service = new TileSetFileService(projectService, store);
    const created = await service.createTileSet({
      name: "Water TileSet",
      imageAssetId: texture.id,
      destination: "assets/tiles/Water.tileset.json",
    });
    const loaded = await service.loadTileSet(created.asset.id);
    loaded.tiles = {
      "0": {
        name: "Water",
        animation: {
          loop: true,
          frames: [
            { tileId: 0, duration: 120 },
            { tileId: 1, duration: 120 },
          ],
        },
      },
    };
    await service.saveTileSet(created.asset.id, loaded);
    const reloaded = await service.loadTileSet(created.asset.id);
    expect(reloaded.tiles?.["0"]?.animation?.frames).toHaveLength(2);
    const catalogue = await store.load();
    const record = catalogue.get(created.asset.id);
    expect(record?.metadata.kind).toBe("tileset");
    if (record?.metadata.kind === "tileset") {
      expect(record.metadata.tiles?.["0"]?.name).toBe("Water");
      expect(record.metadata.tiles?.["0"]?.animation?.loop).not.toBe(false);
    }
  });

  it("rejects destinations that escape assets/", async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "tileset-service-"));
    const projectService = new ProjectService(root);
    const store = new AssetDatabaseStore(projectService);
    const database = await store.load();
    const texture = createTextureAssetRecord({
      name: "Grass",
      path: "assets/Grass.png",
      width: 32,
      height: 32,
      mimeType: "image/png",
    });
    database.add(texture);
    await store.save(database);
    const service = new TileSetFileService(projectService, store);
    await expect(
      service.createTileSet({
        name: "Bad",
        imageAssetId: texture.id,
        destination: "../outside.tileset.json",
      }),
    ).rejects.toThrow(/PATH_ESCAPE|Invalid TileSet destination/);
  });
});
