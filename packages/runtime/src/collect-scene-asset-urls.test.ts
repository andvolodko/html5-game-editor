import { describe, expect, it } from "vitest";
import {
  AssetDatabase,
  createGltfAssetRecord,
  createSpineAssetRecord,
  createStaticAssetResolver,
  createTextureAssetRecord,
  createAsepriteAssetRecord,
  createBitmapFontAssetRecord,
} from "@game-editor/assets";
import {
  createAnimatedSpriteComponent,
  createBitmapTextComponent,
  createEmptyScene,
  createModel3DComponent,
  createNodeWithTransform3D,
  createNodeWithVisual,
  createSpineComponent,
  createSpriteNode,
} from "@game-editor/scene";
import { collectSceneAssetIds, collectSceneAssetUrls } from "./collect-scene-asset-urls.js";

describe("collectSceneAssetUrls", () => {
  it("collects unique texture URLs across scenes", () => {
    const database = new AssetDatabase();
    database.add(
      createTextureAssetRecord({
        id: "asset_a",
        name: "a",
        path: "assets/a.png",
        width: 8,
        height: 8,
        mimeType: "image/png",
      }),
    );
    database.add(
      createTextureAssetRecord({
        id: "asset_b",
        name: "b",
        path: "assets/b.png",
        width: 8,
        height: 8,
        mimeType: "image/png",
      }),
    );
    const resolver = createStaticAssetResolver(database);

    const loading = createEmptyScene("Loading");
    loading.nodes.push(
      createSpriteNode("Hero", { x: 0, y: 0 }, { assetId: "asset_a" }),
    );
    const main = createEmptyScene("Main");
    main.nodes.push(
      createSpriteNode("Hero", { x: 0, y: 0 }, { assetId: "asset_a" }),
      createSpriteNode("Bg", { x: 0, y: 0 }, { assetId: "asset_b" }),
    );

    expect(collectSceneAssetUrls([loading, main], resolver)).toEqual([
      "/assets/a.png",
      "/assets/b.png",
    ]);
    expect(collectSceneAssetIds([loading, main])).toEqual(["asset_a", "asset_b"]);
  });

  it("expands spine and glTF bundles to part URLs", () => {
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

    const spineScene = createEmptyScene("Spine");
    spineScene.nodes.push(
      createNodeWithVisual(
        "Boy",
        { x: 0, y: 0 },
        createSpineComponent({ assetId: "asset_spine" }),
      ),
    );
    const world = createEmptyScene("World");
    world.nodes.push(
      createNodeWithTransform3D(
        "Hero",
        { x: 0, y: 0, z: 0 },
        createModel3DComponent({ assetId: "asset_gltf" }),
      ),
    );

    expect(collectSceneAssetUrls([spineScene, world], resolver)).toEqual([
      "/assets/models/hero.bin",
      "/assets/models/hero.gltf",
      "/assets/models/hero.png",
      "/assets/spine/boy.atlas",
      "/assets/spine/boy.json",
      "/assets/spine/boy.png",
    ]);
  });

  it("expands Aseprite assets to generated PNG/JSON URLs", () => {
    const database = new AssetDatabase();
    database.add(
      createAsepriteAssetRecord({
        id: "asset_hero",
        name: "hero",
        path: "assets/characters/hero.aseprite",
        frameCount: 2,
        tags: [{ name: "idle", from: 0, to: 1 }],
      }),
    );
    const resolver = createStaticAssetResolver(database);
    const scene = createEmptyScene("Main");
    scene.nodes.push(
      createNodeWithVisual(
        "Hero",
        { x: 0, y: 0 },
        createAnimatedSpriteComponent({
          assetId: "asset_hero",
          animation: "idle",
          playing: true,
        }),
      ),
    );
    expect(collectSceneAssetUrls([scene], resolver)).toEqual([
      "/.generated/assets/characters/hero.json",
      "/.generated/assets/characters/hero.png",
    ]);
  });

  it("expands bitmap font bundles to descriptor and page URLs", () => {
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
    const scene = createEmptyScene("Text");
    scene.nodes.push(
      createNodeWithVisual(
        "Label",
        { x: 50, y: 200 },
        createBitmapTextComponent({
          assetId: "asset_font",
          text: "bitmap fonts are supported!",
          fontSize: 55,
        }),
      ),
    );
    expect(collectSceneAssetUrls([scene], resolver)).toEqual([
      "/assets/fonts/desyrel.png",
      "/assets/fonts/desyrel.xml",
    ]);
    expect(collectSceneAssetIds([scene])).toEqual(["asset_font"]);
  });
});
