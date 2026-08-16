import { describe, expect, it } from "vitest";
import { createTextureAssetRecord } from "@game-editor/assets";
import {
  ASSETS_ROOT_FOLDER,
  SCENES_FOLDER,
} from "./asset-browser-model.js";
import {
  assetBrowserItemKey,
  flattenVisibleBrowserItems,
  parseAssetBrowserItemKey,
  rootMostFolderPaths,
} from "./asset-browser-selection.js";

describe("asset-browser-selection", () => {
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
  ];

  it("round-trips item keys", () => {
    expect(parseAssetBrowserItemKey(assetBrowserItemKey({ kind: "asset", id: "x" }))).toEqual({
      kind: "asset",
      id: "x",
    });
    expect(
      parseAssetBrowserItemKey(assetBrowserItemKey({ kind: "folder", path: "assets/x" })),
    ).toEqual({ kind: "folder", path: "assets/x" });
  });

  it("flattens only expanded folders", () => {
    const collapsed = flattenVisibleBrowserItems(
      assets,
      [ASSETS_ROOT_FOLDER, "assets/symbols", SCENES_FOLDER],
      [],
      new Set(),
    );
    expect(collapsed).toEqual([{ kind: "folder", path: ASSETS_ROOT_FOLDER }]);

    const expandedRoot = flattenVisibleBrowserItems(
      assets,
      [ASSETS_ROOT_FOLDER, "assets/symbols", SCENES_FOLDER],
      [],
      new Set([ASSETS_ROOT_FOLDER]),
    );
    expect(expandedRoot.map((item) => assetBrowserItemKey(item))).toEqual([
      "folder:assets",
      "folder:assets/scenes",
      "folder:assets/symbols",
      "asset:asset_a",
    ]);
  });

  it("keeps only root-most folder paths", () => {
    expect(
      rootMostFolderPaths(["assets/a", "assets/a/b", "assets/c"]),
    ).toEqual(["assets/a", "assets/c"]);
  });
});
