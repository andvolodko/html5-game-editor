import { describe, expect, it } from "vitest";
import { createEmptyScene } from "@game-editor/scene";
import {
  allocateSceneFileId,
  isValidSceneFileId,
  type SceneListEntry,
} from "./scene-api-client.js";
import { Editor } from "./editor.js";

describe("scene file id helpers", () => {
  it("validates scene file ids", () => {
    expect(isValidSceneFileId("main")).toBe(true);
    expect(isValidSceneFileId("level-1")).toBe(true);
    expect(isValidSceneFileId("../secret")).toBe(false);
    expect(isValidSceneFileId("")).toBe(false);
  });

  it("allocates unique scene file ids", () => {
    const existing: SceneListEntry[] = [
      { id: "untitled", path: "assets/scenes/untitled.json" },
      { id: "untitled-1", path: "assets/scenes/untitled-1.json" },
    ];
    expect(allocateSceneFileId(existing)).toBe("untitled-2");
    expect(allocateSceneFileId([], "main")).toBe("main");
  });
});

describe("Editor.createScene", () => {
  it("creates via API then loads the new scene", async () => {
    const created = createEmptyScene("Level 1");
    let createArgs: { id: string; name?: string } | undefined;
    const editor = new Editor({
      scene: createEmptyScene("Old"),
      sceneFileId: "old",
      sceneApi: {
        listScenes: async () => [{ id: "old", path: "assets/scenes/old.json" }],
        saveScene: async (_id, scene) => scene,
        loadScene: async (id) =>
          id === "level-1" ? created : createEmptyScene("Old"),
        createScene: async (id, name) => {
          createArgs = { id, name };
          return created;
        },
        renameScene: async () => {
          throw new Error("not used");
        },
        deleteScene: async () => {
          throw new Error("not used");
        },
      },
    });

    await editor.createScene("level-1", "Level 1");
    expect(createArgs).toEqual({ id: "level-1", name: "Level 1" });
    expect(editor.getSceneFileId()).toBe("level-1");
    expect(editor.getScene().name).toBe("Level 1");
    expect(editor.getDirtyState()).toBe("clean");
  });
});

describe("Editor.renameSceneFile", () => {
  it("renames via API and updates the active scene file id", async () => {
    let renameArgs: { from: string; to: string } | undefined;
    const editor = new Editor({
      scene: createEmptyScene("Main"),
      sceneFileId: "main",
      sceneApi: {
        listScenes: async () => [{ id: "main", path: "assets/scenes/main.json" }],
        saveScene: async (_id, scene) => scene,
        loadScene: async () => createEmptyScene("Main"),
        createScene: async () => createEmptyScene("X"),
        renameScene: async (from, to) => {
          renameArgs = { from, to };
          return { id: to, path: `assets/scenes/${to}.json` };
        },
        deleteScene: async () => {
          throw new Error("not used");
        },
      },
    });

    const entry = await editor.renameSceneFile("main", "intro");
    expect(renameArgs).toEqual({ from: "main", to: "intro" });
    expect(entry.id).toBe("intro");
    expect(editor.getSceneFileId()).toBe("intro");
  });
});
