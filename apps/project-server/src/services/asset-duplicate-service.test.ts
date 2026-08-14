import { mkdir, writeFile, mkdtemp, rm, readFile, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AssetDatabase,
  createAsepriteAssetRecord,
  createSpineAssetRecord,
  createTextureAssetRecord,
} from "@game-editor/assets";
import { ProjectService } from "./project-service.js";
import { AssetDatabaseStore } from "./asset-database-store.js";
import { AssetFolderService } from "./asset-folder-service.js";
import { AssetDuplicateService } from "./asset-duplicate-service.js";

describe("AssetDuplicateService", () => {
  let root = "";
  let service: AssetDuplicateService;
  let store: AssetDatabaseStore;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "game-editor-asset-dup-"));
    const projectService = new ProjectService(root);
    store = new AssetDatabaseStore(projectService);
    const folderService = new AssetFolderService(projectService);
    service = new AssetDuplicateService(projectService, store, folderService);

    await mkdir(path.join(root, "assets", "icons"), { recursive: true });
    await writeFile(path.join(root, "assets", "hero.png"), Buffer.from([1, 2, 3]));
    const database = new AssetDatabase();
    database.add(
      createTextureAssetRecord({
        id: "asset_hero",
        name: "hero",
        path: "assets/hero.png",
        width: 1,
        height: 1,
        mimeType: "image/png",
      }),
    );
    await store.save(database);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("copies a texture with a new id and unique file name", async () => {
    const result = await service.duplicateAsset("asset_hero");
    expect(result.asset.id).not.toBe("asset_hero");
    expect(result.asset.name).toBe("hero-1");
    expect(result.asset.path).toBe("assets/hero-1.png");
    expect(result.database.assets).toHaveLength(2);
    await expect(readFile(path.join(root, "assets", "hero-1.png"))).resolves.toEqual(
      Buffer.from([1, 2, 3]),
    );
    await expect(access(path.join(root, "assets", "hero.png"))).resolves.toBeUndefined();
  });

  it("duplicates into another folder keeping the original name when free", async () => {
    const result = await service.duplicateAsset("asset_hero", "assets/icons");
    expect(result.asset.path).toBe("assets/icons/hero.png");
    expect(result.asset.name).toBe("hero");
    expect(result.asset.id).not.toBe("asset_hero");
  });

  it("copies a spine bundle folder and rewrites owned paths", async () => {
    await mkdir(path.join(root, "assets", "hero"), { recursive: true });
    await writeFile(path.join(root, "assets", "hero", "hero.json"), "{}");
    await writeFile(path.join(root, "assets", "hero", "hero.atlas"), "hero.png\n");
    await writeFile(path.join(root, "assets", "hero", "hero.png"), Buffer.from([9]));
    const database = await store.load();
    database.add(
      createSpineAssetRecord({
        id: "asset_spine",
        name: "hero",
        path: "assets/hero/hero.json",
        skeletonFormat: "json",
        atlasPath: "assets/hero/hero.atlas",
        pagePaths: ["assets/hero/hero.png"],
        skins: ["default"],
        animations: ["idle"],
      }),
    );
    await store.save(database);

    const result = await service.duplicateAsset("asset_spine");
    expect(result.asset.path).toBe("assets/hero-1/hero.json");
    expect(result.asset.metadata.kind === "spine" && result.asset.metadata.atlasPath).toBe(
      "assets/hero-1/hero.atlas",
    );
    await expect(access(path.join(root, "assets", "hero-1", "hero.json"))).resolves.toBeUndefined();
    await expect(access(path.join(root, "assets", "hero", "hero.json"))).resolves.toBeUndefined();
  });

  it("copies aseprite source and generated sheet/data", async () => {
    await writeFile(path.join(root, "assets", "hero.aseprite"), Buffer.from([4, 5]));
    await mkdir(path.join(root, ".generated", "assets"), { recursive: true });
    await writeFile(path.join(root, ".generated", "assets", "hero.png"), Buffer.from([7]));
    await writeFile(path.join(root, ".generated", "assets", "hero.json"), "{}");
    const database = await store.load();
    database.add(
      createAsepriteAssetRecord({
        id: "asset_ase",
        name: "hero",
        path: "assets/hero.aseprite",
        width: 8,
        height: 8,
        frameCount: 1,
      }),
    );
    await store.save(database);

    const result = await service.duplicateAsset("asset_ase");
    expect(result.asset.path).toBe("assets/hero-1.aseprite");
    expect(result.asset.metadata.kind === "aseprite" && result.asset.metadata.sheetPath).toBe(
      ".generated/assets/hero-1.png",
    );
    await expect(
      readFile(path.join(root, ".generated", "assets", "hero-1.png")),
    ).resolves.toEqual(Buffer.from([7]));
  });
});
