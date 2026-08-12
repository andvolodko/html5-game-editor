import { describe, expect, it } from "vitest";
import { createTextureAssetRecord } from "@game-editor/assets";
import {
  ASSETS_ROOT_FOLDER,
  SCENES_FOLDER,
  filterAssetsByQuery,
  filterScenesByQuery,
  joinAssetFolder,
  listAssetsInFolder,
  listChildFolders,
  listFolderEntries,
  parentFolder,
} from "./asset-browser-model.js";

describe("asset-browser-model", () => {
  const assets = [
    createTextureAssetRecord({
      id: "asset_a",
      name: "a",
      path: "assets/a.png",
      width: 1,
      height: 1,
      mimeType: "image/png",
    }),
    createTextureAssetRecord({
      id: "asset_b",
      name: "b",
      path: "assets/symbols/b.png",
      width: 1,
      height: 1,
      mimeType: "image/png",
    }),
    createTextureAssetRecord({
      id: "asset_c",
      name: "c",
      path: "assets/symbols/ui/c.png",
      width: 1,
      height: 1,
      mimeType: "image/png",
    }),
  ];

  it("lists child folders and assets in the current folder", () => {
    expect(listChildFolders(assets, ASSETS_ROOT_FOLDER)).toEqual([
      SCENES_FOLDER,
      "assets/symbols",
    ]);
    expect(listAssetsInFolder(assets, ASSETS_ROOT_FOLDER).map((a) => a.id)).toEqual([
      "asset_a",
    ]);
    expect(listAssetsInFolder(assets, "assets/symbols").map((a) => a.id)).toEqual([
      "asset_b",
    ]);
    expect(listChildFolders(assets, "assets/symbols")).toEqual(["assets/symbols/ui"]);
  });

  it("merges empty known folders from the filesystem", () => {
    expect(
      listChildFolders(assets, ASSETS_ROOT_FOLDER, ["assets", "assets/empty", "assets/symbols"]),
    ).toEqual(["assets/empty", SCENES_FOLDER, "assets/symbols"]);
  });

  it("navigates up, joins folder names, and filters by query", () => {
    expect(parentFolder("assets/symbols/ui")).toBe("assets/symbols");
    expect(parentFolder(ASSETS_ROOT_FOLDER)).toBe(ASSETS_ROOT_FOLDER);
    expect(joinAssetFolder("assets/symbols", "ui")).toBe("assets/symbols/ui");
    expect(() => joinAssetFolder("assets", "../x")).toThrow(/Invalid folder name/);
    expect(filterAssetsByQuery(assets, "symbols").map((a) => a.id)).toEqual([
      "asset_b",
      "asset_c",
    ]);
  });

  it("lists folder entries with folders before assets", () => {
    const entries = listFolderEntries(assets, ASSETS_ROOT_FOLDER, [
      "assets",
      "assets/empty",
      "assets/symbols",
    ]);
    expect(
      entries.map((e) =>
        e.kind === "folder" ? e.path : e.kind === "asset" ? e.asset.id : e.id,
      ),
    ).toEqual(["assets/empty", SCENES_FOLDER, "assets/symbols", "asset_a"]);
  });

  it("lists scene files under the scenes folder", () => {
    const scenes = [
      { id: "main", path: "assets/scenes/main.json" },
      { id: "intro", path: "assets/scenes/intro.json" },
    ];
    const entries = listFolderEntries(assets, SCENES_FOLDER, [SCENES_FOLDER], scenes);
    expect(entries.map((e) => (e.kind === "scene" ? e.id : e.kind))).toEqual([
      "intro",
      "main",
    ]);
    expect(filterScenesByQuery(scenes, "main").map((s) => s.id)).toEqual(["main"]);
  });
});
