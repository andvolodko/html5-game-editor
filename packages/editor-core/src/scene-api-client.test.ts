import { describe, expect, it, vi } from "vitest";
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

describe("Editor.duplicateSceneFile", () => {
  it("writes a copy with a new file id and does not switch the open scene", async () => {
    const saved: Array<{ id: string; name: string; documentId: string; nodeCount: number }> =
      [];
    const source = createEmptyScene("Main");
    const editor = new Editor({
      scene: source,
      sceneFileId: "main",
      sceneApi: {
        listScenes: async () => [{ id: "main", path: "assets/scenes/main.json" }],
        saveScene: async (id, scene) => {
          saved.push({
            id,
            name: scene.name,
            documentId: scene.id,
            nodeCount: scene.nodes.length,
          });
          return scene;
        },
        loadScene: async () => source,
        createScene: async () => createEmptyScene("X"),
        renameScene: async () => {
          throw new Error("not used");
        },
        deleteScene: async () => {
          throw new Error("not used");
        },
      },
    });
    editor.createSprite("Hero");
    expect(editor.hasUnsavedChanges()).toBe(true);

    const entry = await editor.duplicateSceneFile("main");
    expect(entry).toEqual({ id: "main-1", path: "assets/scenes/main-1.json" });
    expect(saved).toHaveLength(1);
    expect(saved[0]?.id).toBe("main-1");
    expect(saved[0]?.name).toBe("Main Copy");
    expect(saved[0]?.documentId).not.toBe(source.id);
    expect(saved[0]?.nodeCount).toBe(1);
    expect(editor.getSceneFileId()).toBe("main");
    expect(editor.hasUnsavedChanges()).toBe(true);
  });

  it("duplicates a non-active scene from disk", async () => {
    const other = createEmptyScene("Other");
    const saved: string[] = [];
    const editor = new Editor({
      scene: createEmptyScene("Main"),
      sceneFileId: "main",
      sceneApi: {
        listScenes: async () => [
          { id: "main", path: "assets/scenes/main.json" },
          { id: "other", path: "assets/scenes/other.json" },
        ],
        saveScene: async (id, scene) => {
          saved.push(id);
          return scene;
        },
        loadScene: async (id) => (id === "other" ? other : createEmptyScene("Main")),
        createScene: async () => createEmptyScene("X"),
        renameScene: async () => {
          throw new Error("not used");
        },
        deleteScene: async () => {
          throw new Error("not used");
        },
      },
    });

    const entry = await editor.duplicateSceneFile("other");
    expect(entry.id).toBe("other-1");
    expect(saved).toEqual(["other-1"]);
    expect(editor.getSceneFileId()).toBe("main");
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

  it("undo/redo restores the previous scene file id", async () => {
    const calls: Array<[string, string]> = [];
    const editor = new Editor({
      scene: createEmptyScene("Main"),
      sceneFileId: "main",
      sceneApi: {
        listScenes: async () => [{ id: "main", path: "assets/scenes/main.json" }],
        saveScene: async (_id, scene) => scene,
        loadScene: async () => createEmptyScene("Main"),
        createScene: async () => createEmptyScene("X"),
        renameScene: async (from, to) => {
          calls.push([from, to]);
          return { id: to, path: `assets/scenes/${to}.json` };
        },
        deleteScene: async () => {
          throw new Error("not used");
        },
      },
    });

    await editor.renameSceneFile("main", "intro");
    expect(editor.getSceneFileId()).toBe("intro");
    expect(editor.commands.canUndo).toBe(true);

    editor.undo();
    await vi.waitFor(() => {
      expect(editor.getSceneFileId()).toBe("main");
    });
    expect(calls).toEqual([
      ["main", "intro"],
      ["intro", "main"],
    ]);

    editor.redo();
    await vi.waitFor(() => {
      expect(editor.getSceneFileId()).toBe("intro");
    });
    expect(calls).toEqual([
      ["main", "intro"],
      ["intro", "main"],
      ["main", "intro"],
    ]);
  });
});

describe("Editor.deleteSceneFile", () => {
  it("undo restores a deleted inactive scene without switching the open document", async () => {
    const other = createEmptyScene("Other");
    const files = new Map<string, ReturnType<typeof createEmptyScene>>([
      ["main", createEmptyScene("Main")],
      ["other", other],
    ]);
    const deleted: string[] = [];
    const editor = new Editor({
      scene: createEmptyScene("Main"),
      sceneFileId: "main",
      sceneApi: {
        listScenes: async () =>
          [...files.keys()].sort().map((id) => ({
            id,
            path: `assets/scenes/${id}.json`,
          })),
        saveScene: async (id, scene) => {
          files.set(id, scene);
          return scene;
        },
        loadScene: async (id) => {
          const scene = files.get(id);
          if (!scene) {
            throw new Error(`missing ${id}`);
          }
          return scene;
        },
        createScene: async () => createEmptyScene("X"),
        renameScene: async () => {
          throw new Error("not used");
        },
        deleteScene: async (id) => {
          deleted.push(id);
          files.delete(id);
        },
      },
    });

    await editor.deleteSceneFile("other", "main");
    expect(deleted).toEqual(["other"]);
    expect(files.has("other")).toBe(false);
    expect(editor.getSceneFileId()).toBe("main");

    editor.undo();
    await vi.waitFor(() => {
      expect(files.has("other")).toBe(true);
    });
    expect(editor.getSceneFileId()).toBe("main");
    expect(files.get("other")?.name).toBe("Other");
  });

  it("undo of deleting the open scene reopens it", async () => {
    const main = createEmptyScene("Main");
    const other = createEmptyScene("Other");
    const files = new Map<string, ReturnType<typeof createEmptyScene>>([
      ["main", main],
      ["other", other],
    ]);
    const editor = new Editor({
      scene: main,
      sceneFileId: "main",
      sceneApi: {
        listScenes: async () =>
          [...files.keys()].sort().map((id) => ({
            id,
            path: `assets/scenes/${id}.json`,
          })),
        saveScene: async (id, scene) => {
          files.set(id, scene);
          return scene;
        },
        loadScene: async (id) => {
          const scene = files.get(id);
          if (!scene) {
            throw new Error(`missing ${id}`);
          }
          return scene;
        },
        createScene: async () => createEmptyScene("X"),
        renameScene: async () => {
          throw new Error("not used");
        },
        deleteScene: async (id) => {
          files.delete(id);
        },
      },
    });
    editor.createSprite("Hero");
    const snapshotName = editor.getScene().name;

    await editor.deleteSceneFile("main", "other");
    expect(editor.getSceneFileId()).toBe("other");
    expect(editor.commands.canUndo).toBe(true);
    expect(editor.getScene().nodes).toHaveLength(0);

    editor.undo();
    await vi.waitFor(() => {
      expect(editor.getSceneFileId()).toBe("main");
    });
    expect(editor.getScene().name).toBe(snapshotName);
    expect(editor.getScene().nodes).toHaveLength(1);
  });
});
