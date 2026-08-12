import { mkdir, writeFile, mkdtemp, rm, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTextureAssetRecord, createSpineAssetRecord } from "@game-editor/assets";
import { ValidationError } from "@game-editor/core";
import { ProjectService } from "./project-service.js";
import { AssetDatabaseStore } from "./asset-database-store.js";
import { AssetFolderService } from "./asset-folder-service.js";
import { AssetMutationService } from "./asset-mutation-service.js";
import { AssetDatabase } from "@game-editor/assets";

describe("AssetMutationService", () => {
  let root = "";
  let service: AssetMutationService;
  let store: AssetDatabaseStore;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "game-editor-asset-mutate-"));
    const projectService = new ProjectService(root);
    store = new AssetDatabaseStore(projectService);
    const folderService = new AssetFolderService(projectService);
    service = new AssetMutationService(projectService, store, folderService);

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

  it("renames an asset file and keeps the stable id", async () => {
    const result = await service.renameAsset("asset_hero", "player");
    expect(result.asset.id).toBe("asset_hero");
    expect(result.asset.name).toBe("player");
    expect(result.asset.path).toBe("assets/player.png");
  });

  it("moves an asset into another folder", async () => {
    const result = await service.moveAsset("asset_hero", "assets/icons");
    expect(result.asset.id).toBe("asset_hero");
    expect(result.asset.path).toBe("assets/icons/hero.png");
  });

  it("renames a folder and rewrites nested asset paths", async () => {
    await writeFile(path.join(root, "assets", "icons", "coin.png"), Buffer.from([9]));
    const database = await store.load();
    database.add(
      createTextureAssetRecord({
        id: "asset_coin",
        name: "coin",
        path: "assets/icons/coin.png",
        width: 1,
        height: 1,
        mimeType: "image/png",
      }),
    );
    await store.save(database);

    const result = await service.renameFolder("assets/icons", "ui");
    expect(result.folder).toBe("assets/ui");
    expect(result.database.assets.find((a) => a.id === "asset_coin")?.path).toBe(
      "assets/ui/coin.png",
    );
    expect(result.folders).toContain("assets/ui");
    expect(result.folders).not.toContain("assets/icons");
  });

  it("moves a spine bundle folder and rewrites owned paths", async () => {
    await mkdir(path.join(root, "assets", "hero"), { recursive: true });
    await writeFile(path.join(root, "assets", "hero", "hero.json"), "{}");
    await writeFile(path.join(root, "assets", "hero", "hero.atlas"), "hero.png\nsize: 1,1\n");
    await writeFile(path.join(root, "assets", "hero", "hero.png"), Buffer.from([1]));
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

    const result = await service.moveAsset("asset_spine", "assets/icons");
    expect(result.asset.path).toBe("assets/icons/hero/hero.json");
    expect(result.asset.metadata.kind === "spine" && result.asset.metadata.atlasPath).toBe(
      "assets/icons/hero/hero.atlas",
    );
  });

  it("deletes an asset file and removes it from the manifest", async () => {
    const result = await service.deleteAsset("asset_hero");
    expect(result.database.assets).toEqual([]);
    await expect(access(path.join(root, "assets", "hero.png"))).rejects.toThrow();
  });

  it("deletes a folder and nested assets", async () => {
    await writeFile(path.join(root, "assets", "icons", "coin.png"), Buffer.from([9]));
    const database = await store.load();
    database.add(
      createTextureAssetRecord({
        id: "asset_coin",
        name: "coin",
        path: "assets/icons/coin.png",
        width: 1,
        height: 1,
        mimeType: "image/png",
      }),
    );
    await store.save(database);

    const result = await service.deleteFolder("assets/icons");
    expect(result.database.assets.find((a) => a.id === "asset_coin")).toBeUndefined();
    expect(result.folders).not.toContain("assets/icons");
    expect(result.database.assets.some((a) => a.id === "asset_hero")).toBe(true);
  });

  it("refuses unsafe folder delete targets", async () => {
    await expect(service.deleteFolder("assets")).rejects.toBeInstanceOf(ValidationError);
    await expect(service.deleteFolder("assets/../assets/icons")).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(service.deleteFolder("assets/scenes")).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(service.deleteFolder("/assets/icons")).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});
