import { describe, expect, it } from "vitest";
import type { AssetRecord } from "@game-editor/assets";
import { buildAssetSelectOptions } from "./asset-select-options";

function texture(id: string, name: string, path: string): AssetRecord {
  return {
    id,
    type: "texture",
    name,
    path,
    metadata: {
      kind: "texture",
      width: 32,
      height: 32,
      mimeType: "image/png",
    },
  };
}

function spine(id: string, name: string, path: string): AssetRecord {
  return {
    id,
    type: "spine",
    name,
    path,
    metadata: {
      kind: "spine",
      skeletonFormat: "json",
      atlasPath: `${path}.atlas`,
      pagePaths: [`${path}.png`],
      skins: ["default"],
      animations: ["idle"],
    },
  };
}

describe("buildAssetSelectOptions", () => {
  it("filters by kind and sorts by name then path", () => {
    const assets = [
      texture("asset_b", "Hero", "assets/b.png"),
      spine("asset_s", "Boss", "assets/boss"),
      texture("asset_a", "Hero", "assets/a.png"),
      texture("asset_c", "Enemy", "assets/c.png"),
    ];

    expect(buildAssetSelectOptions(assets, "texture", undefined)).toEqual([
      { value: "asset_c", label: "Enemy (assets/c.png)" },
      { value: "asset_a", label: "Hero (assets/a.png)" },
      { value: "asset_b", label: "Hero (assets/b.png)" },
    ]);
  });

  it("prepends an orphan current id so the value stays selectable", () => {
    const assets = [texture("asset_ok", "Ok", "assets/ok.png")];

    expect(
      buildAssetSelectOptions(assets, "texture", "asset_gone"),
    ).toEqual([
      { value: "asset_gone", label: "(missing) asset_gone" },
      { value: "asset_ok", label: "Ok (assets/ok.png)" },
    ]);
  });

  it("does not duplicate the current id when it is already in the list", () => {
    const assets = [texture("asset_ok", "Ok", "assets/ok.png")];

    expect(buildAssetSelectOptions(assets, "texture", "asset_ok")).toEqual([
      { value: "asset_ok", label: "Ok (assets/ok.png)" },
    ]);
  });
});
