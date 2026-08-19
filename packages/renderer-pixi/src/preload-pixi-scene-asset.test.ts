import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AssetDatabase,
  createGltfAssetRecord,
  createSpineAssetRecord,
  createStaticAssetResolver,
  createTextureAssetRecord,
  createAudioAssetRecord,
  createAsepriteAssetRecord,
  createBitmapFontAssetRecord,
  createWebFontAssetRecord,
  createTileSetAssetRecord,
} from "@game-editor/assets";

const load = vi.fn(async () => undefined);

vi.mock("pixi.js", () => ({
  Assets: {
    load: (...args: unknown[]) => load(...args),
  },
}));

import { preloadPixiSceneAsset } from "./preload-pixi-scene-asset.js";
import { resetCachedAssetFetchForTests } from "./cached-asset-fetch.js";
import { resetPixiTextureUrlRetainsForTests } from "./pixi-texture-cache.js";

describe("preloadPixiSceneAsset", () => {
  beforeEach(() => {
    load.mockClear();
    vi.unstubAllGlobals();
    resetCachedAssetFetchForTests();
    resetPixiTextureUrlRetainsForTests();
  });

  it("loads textures through Pixi Assets with the texture parser", async () => {
    const database = new AssetDatabase();
    database.add(
      createTextureAssetRecord({
        id: "asset_hero",
        name: "hero",
        path: "assets/hero.png",
        width: 8,
        height: 8,
        mimeType: "image/png",
      }),
    );
    const resolver = createStaticAssetResolver(database);

    await preloadPixiSceneAsset(resolver, "asset_hero");

    expect(load).toHaveBeenCalledWith({
      src: "/assets/hero.png",
      parser: "texture",
      format: "png",
    });
  });

  it("preloads a tileset by loading its image texture", async () => {
    const database = new AssetDatabase();
    database.add(
      createTextureAssetRecord({
        id: "asset_atlas",
        name: "atlas",
        path: "assets/atlas.png",
        width: 32,
        height: 32,
        mimeType: "image/png",
      }),
    );
    database.add(
      createTileSetAssetRecord({
        id: "asset_tileset",
        name: "ground",
        path: "assets/ground.tileset.json",
        tilesetId: "tileset_ground",
        imageAssetId: "asset_atlas",
        tileWidth: 16,
        tileHeight: 16,
        columns: 2,
        rows: 2,
      }),
    );
    const resolver = createStaticAssetResolver(database);

    await preloadPixiSceneAsset(resolver, "asset_tileset");

    expect(load).toHaveBeenCalledWith({
      src: "/assets/atlas.png",
      parser: "texture",
      format: "png",
    });
  });

  it("loads spine atlas pages through Assets and fetches skeleton/atlas", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(0),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const database = new AssetDatabase();
    database.add(
      createSpineAssetRecord({
        id: "asset_spine",
        name: "boy",
        path: "assets/spine/boy.json",
        skeletonFormat: "json",
        atlasPath: "assets/spine/boy.atlas",
        pagePaths: ["assets/spine/boy.png"],
      }),
    );
    const resolver = createStaticAssetResolver(database);

    await preloadPixiSceneAsset(resolver, "asset_spine");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(load).toHaveBeenCalledWith("/assets/spine/boy.png");
  });

  it("loads Aseprite spritesheet JSON through Pixi Assets", async () => {
    load.mockImplementation(async () => ({ textures: {}, animations: {} }));
    const database = new AssetDatabase();
    database.add(
      createAsepriteAssetRecord({
        id: "asset_hero",
        name: "hero",
        path: "assets/hero.aseprite",
        frameCount: 2,
        tags: [{ name: "idle", from: 0, to: 1 }],
      }),
    );
    const resolver = createStaticAssetResolver(database);
    await preloadPixiSceneAsset(resolver, "asset_hero");
    expect(load).toHaveBeenCalledWith({
      src: "/.generated/assets/hero.json",
      data: { cachePrefix: "/.generated/assets/hero.json#" },
    });
  });

  it("skips glTF assets", async () => {
    const database = new AssetDatabase();
    database.add(
      createGltfAssetRecord({
        id: "asset_gltf",
        name: "hero",
        path: "assets/hero.glb",
        mimeType: "model/gltf-binary",
        format: "glb",
      }),
    );
    const resolver = createStaticAssetResolver(database);

    await preloadPixiSceneAsset(resolver, "asset_gltf");
    expect(load).not.toHaveBeenCalled();
  });

  it("fetches non-texture catalogue URLs (audio)", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(0),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const database = new AssetDatabase();
    database.add(
      createAudioAssetRecord({
        id: "asset_sfx",
        name: "click",
        path: "assets/click.mp3",
        mimeType: "audio/mpeg",
      }),
    );
    const resolver = createStaticAssetResolver(database);

    await preloadPixiSceneAsset(resolver, "asset_sfx");
    expect(load).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalled();
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("/assets/click.mp3");
  });

  it("fetches bitmap font XML and loads page textures", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(0),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const database = new AssetDatabase();
    database.add(
      createBitmapFontAssetRecord({
        id: "asset_font",
        name: "desyrel",
        path: "assets/fonts/desyrel.xml",
        fontFamily: "Desyrel",
        pagePaths: ["assets/fonts/desyrel.png"],
      }),
    );
    const resolver = createStaticAssetResolver(database);

    await preloadPixiSceneAsset(resolver, "asset_font");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("/assets/fonts/desyrel.xml");
    expect(load).toHaveBeenCalledWith("/assets/fonts/desyrel.png");
  });

  it("loads webfonts through Pixi Assets with the web-font parser", async () => {
    const database = new AssetDatabase();
    database.add(
      createWebFontAssetRecord({
        id: "asset_webfont",
        name: "ChaChicle",
        path: "assets/fonts/webfonts/ChaChicle.ttf",
        fontFamily: "ChaChicle",
        mimeType: "font/ttf",
        format: "ttf",
      }),
    );
    const resolver = createStaticAssetResolver(database);

    await preloadPixiSceneAsset(resolver, "asset_webfont");

    expect(load).toHaveBeenCalledWith({
      src: "/assets/fonts/webfonts/ChaChicle.ttf",
      parser: "web-font",
      data: { family: "ChaChicle" },
    });
  });
});
