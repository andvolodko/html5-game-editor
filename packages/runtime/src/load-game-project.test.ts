import { describe, expect, it } from "vitest";
import {
  createTextureAssetRecord,
  serializeAssetDatabase,
  createEmptyAssetDatabase,
} from "@game-editor/assets";
import { createEmptyScene, createSpriteNode } from "@game-editor/scene";
import {
  resolveGameProject,
  sceneModulesById,
} from "./load-game-project.js";

describe("resolveGameProject", () => {
  it("loads start scene and builds a static asset resolver", () => {
    const scene = createEmptyScene("Loading");
    scene.nodes.push(createSpriteNode("Hero", { x: 1, y: 2 }));

    const db = createEmptyAssetDatabase();
    db.assets.push(
      createTextureAssetRecord({
        id: "asset_hero",
        name: "hero",
        path: "assets/ui/hero.png",
        width: 32,
        height: 32,
        mimeType: "image/png",
      }),
    );

    const loaded = resolveGameProject({
      project: {
        name: "demo",
        version: 1,
        displayName: "Demo",
        renderers: ["pixi"],
        startScene: "loading",
      },
      assets: JSON.parse(serializeAssetDatabase(db)),
      scenes: {
        loading: JSON.parse(JSON.stringify(scene)),
        main: createEmptyScene("Main"),
      },
    });

    expect(loaded.project.startScene).toBe("loading");
    expect(loaded.scene.name).toBe("Loading");
    expect(loaded.scene.nodes).toHaveLength(1);
    expect(loaded.assetResolver.resolveUrl("asset_hero")).toBe(
      "/assets/ui/hero.png",
    );
  });

  it("throws when start scene is missing", () => {
    expect(() =>
      resolveGameProject({
        project: {
          name: "demo",
          version: 1,
          displayName: "Demo",
          renderers: ["pixi"],
          startScene: "missing",
        },
        assets: createEmptyAssetDatabase(),
        scenes: { main: createEmptyScene("Main") },
      }),
    ).toThrow(/Start scene "missing"/);
  });
});

describe("sceneModulesById", () => {
  it("maps Vite glob paths to scene file ids", () => {
    expect(
      sceneModulesById({
        "../assets/scenes/main.json": { name: "Main" },
        "../assets/scenes/loading.json": { name: "Loading" },
      }),
    ).toEqual({
      main: { name: "Main" },
      loading: { name: "Loading" },
    });
  });
});
