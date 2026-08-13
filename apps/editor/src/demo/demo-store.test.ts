import { describe, expect, it } from "vitest";
import {
  ASSET_SCHEMA_VERSION,
  createTextureAssetRecord,
} from "@game-editor/assets";
import { createEmptyScene } from "@game-editor/scene";
import { DomainError } from "@game-editor/core";
import { foldersFromAssetDatabase } from "./folders-from-assets";
import { createDemoEditorClients } from "./create-demo-clients";
import {
  projectIdFromGlobPath,
  sceneIdFromGlobPath,
} from "./demo-glob-paths";
import {
  DEMO_STORAGE_KEY,
  DEMO_UNAVAILABLE_CODE,
  DemoProjectStore,
  clearDemoPersistence,
  type DemoSnapshot,
  type DemoStorage,
} from "./demo-store";

const START_SCENE_ID = "boot";
const OTHER_SCENE_ID = "level";

function memoryStorage(initial?: Record<string, string>): DemoStorage {
  const data = new Map(Object.entries(initial ?? {}));
  return {
    getItem(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

function fixtureSnapshot(projectId = "example-game"): DemoSnapshot {
  const texture = createTextureAssetRecord({
    name: "hero",
    path: "assets/ui/hero.png",
    width: 32,
    height: 32,
    mimeType: "image/png",
  });
  return {
    projectId,
    project: {
      name: projectId,
      version: 1,
      displayName: projectId === "example-game" ? "Example Game" : "Example Game 2",
      renderers: ["pixi"],
      startScene: START_SCENE_ID,
      resolution: { width: 1280, height: 720 },
      background: "#101010",
    },
    assets: {
      version: ASSET_SCHEMA_VERSION,
      assets: [texture],
    },
    scenes: {
      [START_SCENE_ID]: createEmptyScene("Boot"),
      [OTHER_SCENE_ID]: createEmptyScene("Level"),
    },
  };
}

describe("demo glob paths", () => {
  it("reads project and scene ids from Vite glob keys", () => {
    expect(
      projectIdFromGlobPath("../../../../games/example-game-2/project.json"),
    ).toBe("example-game-2");
    expect(
      sceneIdFromGlobPath(
        "../../../../games/example-game/assets/scenes/loading.json",
      ),
    ).toBe("loading");
  });
});

describe("foldersFromAssetDatabase", () => {
  it("includes ancestors and the reserved scenes folder", () => {
    const database = {
      version: ASSET_SCHEMA_VERSION,
      assets: [
        createTextureAssetRecord({
          name: "hero",
          path: "assets/ui/buttons/hero.png",
          width: 8,
          height: 8,
          mimeType: "image/png",
        }),
      ],
    };
    expect(foldersFromAssetDatabase(database)).toEqual([
      "assets",
      "assets/scenes",
      "assets/ui",
      "assets/ui/buttons",
    ]);
  });
});

describe("DemoProjectStore", () => {
  it("loads, saves, and restores scenes from storage", () => {
    const storage = memoryStorage();
    const store = new DemoProjectStore([fixtureSnapshot()], storage);
    const edited = createEmptyScene("Boot edited");
    store.saveScene(START_SCENE_ID, edited);
    const restored = new DemoProjectStore([fixtureSnapshot()], storage);
    expect(restored.loadScene(START_SCENE_ID).name).toBe("Boot edited");
  });

  it("renames a scene and updates startScene", () => {
    const store = new DemoProjectStore([fixtureSnapshot()]);
    store.renameScene(START_SCENE_ID, "intro");
    expect(store.getProject().startScene).toBe("intro");
    expect(store.loadScene("intro").name).toBe("Boot");
  });

  it("refuses to delete the start scene or the last scene", () => {
    const store = new DemoProjectStore([fixtureSnapshot()]);
    expect(() => store.deleteScene(START_SCENE_ID)).toThrow(DomainError);
    store.deleteScene(OTHER_SCENE_ID);
    expect(() => store.deleteScene(START_SCENE_ID)).toThrow(/at least one scene/);
  });

  it("keeps scene edits isolated per project", () => {
    const storage = memoryStorage();
    const store = new DemoProjectStore(
      [fixtureSnapshot("example-game"), fixtureSnapshot("example-game-2")],
      storage,
    );
    store.saveScene(START_SCENE_ID, createEmptyScene("Game 1 boot"));
    store.openProject("example-game-2");
    expect(store.loadScene(START_SCENE_ID).name).toBe("Boot");
    store.saveScene(START_SCENE_ID, createEmptyScene("Game 2 boot"));
    store.openProject("example-game");
    expect(store.loadScene(START_SCENE_ID).name).toBe("Game 1 boot");
  });
});

describe("createDemoEditorClients", () => {
  it("resolves static asset URLs namespaced by project id", async () => {
    const snapshot = fixtureSnapshot();
    const texture = snapshot.assets.assets[0]!;
    const clients = createDemoEditorClients([snapshot], {
      assetBaseUrl: "/html5-game-editor/demo/",
      catalogs: { "example-game": { components: [], busEvents: [] } },
    });
    const listed = await clients.assetApi.listAssets();
    expect(listed.folders).toContain("assets/ui");
    expect(clients.assetApi.getAssetContentUrl(texture.id)).toBe(
      "/html5-game-editor/demo/example-game/assets/ui/hero.png",
    );
    await expect(clients.assetApi.importAssets([])).rejects.toMatchObject({
      code: DEMO_UNAVAILABLE_CODE,
    });
  });

  it("lists every bundled demo project and switches assets", async () => {
    const first = fixtureSnapshot("example-game");
    const second = fixtureSnapshot("example-game-2");
    const clients = createDemoEditorClients([first, second], {
      assetBaseUrl: "/demo/",
      catalogs: {
        "example-game": { components: [], busEvents: [] },
        "example-game-2": { components: [], busEvents: [] },
      },
    });
    const listed = await clients.projectApi.listProjects();
    expect(listed.activeProjectId).toBe("example-game");
    expect(listed.projects.map((project) => project.id)).toEqual([
      "example-game",
      "example-game-2",
    ]);
    await clients.projectApi.openProject("example-game-2");
    const secondTexture = second.assets.assets[0]!;
    expect(clients.assetApi.getAssetContentUrl(secondTexture.id)).toBe(
      "/demo/example-game-2/assets/ui/hero.png",
    );
    await expect(clients.projectApi.openProject("missing")).rejects.toMatchObject({
      code: "PROJECT_NOT_FOUND",
    });
  });

  it("clears persisted demo edits", () => {
    const storage = memoryStorage({ [DEMO_STORAGE_KEY]: "{}" });
    clearDemoPersistence(storage);
    expect(storage.getItem(DEMO_STORAGE_KEY)).toBeNull();
  });
});
