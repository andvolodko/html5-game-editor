import { describe, expect, it } from "vitest";
import { AssetDatabase } from "./asset-database.js";
import {
  createGltfAssetRecord,
  createSpineAssetRecord,
  createTextureAssetRecord,
  createAsepriteAssetRecord,
} from "./factories.js";
import { createStaticAssetResolver } from "./static-asset-resolver.js";

describe("createStaticAssetResolver", () => {
  it("maps texture assetIds to project-relative URLs", () => {
    const database = new AssetDatabase();
    database.add(
      createTextureAssetRecord({
        id: "asset_hero",
        name: "hero",
        path: "assets/ui/hero.png",
        width: 64,
        height: 64,
        mimeType: "image/png",
      }),
    );
    const resolver = createStaticAssetResolver(database);

    expect(resolver.resolveUrl("asset_hero")).toBe("/assets/ui/hero.png");
    expect(resolver.resolveTextureFormat?.("asset_hero")).toBe("png");
    expect(resolver.resolveUrl("missing")).toBeUndefined();
  });

  it("prefixes project paths with a subdirectory public base", () => {
    const database = new AssetDatabase();
    database.add(
      createTextureAssetRecord({
        id: "asset_hero",
        name: "hero",
        path: "assets/ui/hero.png",
        width: 64,
        height: 64,
        mimeType: "image/png",
      }),
    );
    const resolver = createStaticAssetResolver(database, {
      baseUrl: "/html5-game-editor/games/editor-features-demo/",
    });

    expect(resolver.resolveUrl("asset_hero")).toBe(
      "/html5-game-editor/games/editor-features-demo/assets/ui/hero.png",
    );
  });

  it("resolves spine skeleton, atlas, and page URLs", () => {
    const database = new AssetDatabase();
    database.add(
      createSpineAssetRecord({
        id: "asset_spine",
        name: "boy",
        path: "assets/spine/boy/boy.json",
        skeletonFormat: "json",
        atlasPath: "assets/spine/boy/boy.atlas",
        pagePaths: ["assets/spine/boy/boy.png"],
        skins: ["default"],
        animations: ["idle"],
      }),
    );
    const resolver = createStaticAssetResolver(database, { baseUrl: "/" });

    expect(resolver.resolveSpineUrls?.("asset_spine")).toEqual({
      skeletonUrl: "/assets/spine/boy/boy.json",
      skeletonFormat: "json",
      atlasUrl: "/assets/spine/boy/boy.atlas",
      pageUrls: { "boy.png": "/assets/spine/boy/boy.png" },
    });
    expect(resolver.resolveSpinePartUrl?.("asset_spine", "boy.atlas")).toBe(
      "/assets/spine/boy/boy.atlas",
    );
  });

  it("resolves glTF root and part URLs", () => {
    const database = new AssetDatabase();
    database.add(
      createGltfAssetRecord({
        id: "asset_gltf",
        name: "hero",
        path: "assets/models/hero.gltf",
        mimeType: "model/gltf+json",
        format: "gltf",
        bufferPaths: ["assets/models/hero.bin"],
        imagePaths: ["assets/models/hero.png"],
      }),
    );
    const resolver = createStaticAssetResolver(database);

    expect(resolver.resolveGltfUrls?.("asset_gltf")).toEqual({
      rootUrl: "/assets/models/hero.gltf",
      format: "gltf",
      partUrls: {
        "hero.bin": "/assets/models/hero.bin",
        "hero.png": "/assets/models/hero.png",
      },
    });
    expect(resolver.resolveGltfPartUrl?.("asset_gltf", "hero.bin")).toBe(
      "/assets/models/hero.bin",
    );
  });

  it("resolves generated Aseprite spritesheet URLs, not the source .aseprite", () => {
    const database = new AssetDatabase();
    database.add(
      createAsepriteAssetRecord({
        id: "asset_hero",
        name: "hero",
        path: "assets/characters/hero.aseprite",
        frameCount: 4,
        tags: [{ name: "idle", from: 0, to: 1 }],
      }),
    );
    const resolver = createStaticAssetResolver(database);

    expect(resolver.resolveAsepriteUrls?.("asset_hero")).toEqual({
      jsonUrl: "/.generated/assets/characters/hero.json",
      imageUrl: "/.generated/assets/characters/hero.png",
      tags: ["idle"],
      frameDurations: [],
      frameCount: 4,
    });
    expect(resolver.resolveAsepritePartUrl?.("asset_hero", "hero.json")).toBe(
      "/.generated/assets/characters/hero.json",
    );
    expect(resolver.resolveUrl("asset_hero")).toBe(
      "/assets/characters/hero.aseprite",
    );
  });
});
