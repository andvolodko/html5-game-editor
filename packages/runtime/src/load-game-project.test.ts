import { describe, expect, it } from "vitest";
import {
  createPrefabAssetRecord,
  createTextureAssetRecord,
  serializeAssetDatabase,
  createEmptyAssetDatabase,
} from "@game-editor/assets";
import {
  createEmptyScene,
  createSpriteNode,
  instantiatePrefab,
  PREFAB_SCHEMA_VERSION,
  type PrefabData,
} from "@game-editor/scene";
import {
  prefabModulesByPath,
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
    expect(Object.keys(loaded.scenes).sort()).toEqual(["loading", "main"]);
    expect(loaded.scenes.main?.name).toBe("Main");
    expect(loaded.assetResolver.resolveUrl("asset_hero")).toBe(
      "/assets/ui/hero.png",
    );
  });

  it("prefixes static asset URLs with the Vite public base", () => {
    const scene = createEmptyScene("Main");
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
        startScene: "main",
      },
      assets: JSON.parse(serializeAssetDatabase(db)),
      scenes: { main: JSON.parse(JSON.stringify(scene)) },
      baseUrl: "/html5-game-editor/games/editor-features-demo/",
    });

    expect(loaded.assetResolver.resolveUrl("asset_hero")).toBe(
      "/html5-game-editor/games/editor-features-demo/assets/ui/hero.png",
    );
  });

  it("resolves prefab instances in bundled scenes", () => {
    const prefabRoot = createSpriteNode("Hero", { x: 0, y: 0 }, {
      assetId: "asset_hero",
      tint: 0xffffff,
    });
    const prefab: PrefabData = {
      version: PREFAB_SCHEMA_VERSION,
      id: "prefab_hero",
      name: "Hero",
      root: prefabRoot,
    };
    const { node } = instantiatePrefab(prefab, {
      prefabAssetId: "asset_prefab_hero",
      position2D: { x: 40, y: 80 },
    });
    const scene = createEmptyScene("Main");
    scene.nodes = [node];

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
      createPrefabAssetRecord({
        id: "asset_prefab_hero",
        name: "Hero",
        path: "assets/prefabs/hero.prefab.json",
        prefabId: "prefab_hero",
      }),
    );

    const loaded = resolveGameProject({
      project: {
        name: "demo",
        version: 1,
        displayName: "Demo",
        renderers: ["pixi"],
        startScene: "main",
      },
      assets: JSON.parse(serializeAssetDatabase(db)),
      scenes: { main: JSON.parse(JSON.stringify(scene)) },
      prefabsByPath: {
        "assets/prefabs/hero.prefab.json": prefab,
      },
    });

    expect(loaded.prefabs.get("asset_prefab_hero")?.id).toBe("prefab_hero");
    expect(loaded.scene.nodes[0]?.prefab?.prefabAssetId).toBe("asset_prefab_hero");
    expect(loaded.scene.nodes[0]?.id).not.toBe(prefab.root.id);
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

describe("prefabModulesByPath", () => {
  it("maps Vite glob paths to project-relative prefab paths", () => {
    expect(
      prefabModulesByPath({
        "../assets/prefabs/ui-button.prefab.json": { name: "UI Button" },
        "../assets/prefabs/nested/character.prefab.json": { name: "Character" },
      }),
    ).toEqual({
      "assets/prefabs/ui-button.prefab.json": { name: "UI Button" },
      "assets/prefabs/nested/character.prefab.json": { name: "Character" },
    });
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
