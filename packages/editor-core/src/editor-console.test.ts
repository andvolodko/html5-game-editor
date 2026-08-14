import { describe, expect, it, vi } from "vitest";
import { createEmptyScene } from "@game-editor/scene";
import { Editor } from "./editor.js";
import type { SceneApiClient } from "./scene-api-client.js";
import {
  EDITOR_CONSOLE_CATEGORY_SCENE,
  EDITOR_CONSOLE_EVENT_SCENE_OPENED,
  EditorConsole,
  formatSceneOpenedMessage,
} from "./editor-console.js";

function sceneApi(load: (id: string) => ReturnType<typeof createEmptyScene>): SceneApiClient {
  return {
    listScenes: async () => [],
    saveScene: async (_id, scene) => scene,
    loadScene: async (id) => load(id),
    createScene: async () => createEmptyScene("X"),
    renameScene: async (id) => ({ id, path: `assets/scenes/${id}.json` }),
    deleteScene: async () => undefined,
  };
}

describe("formatSceneOpenedMessage", () => {
  it("includes scene name and file id", () => {
    expect(formatSceneOpenedMessage("main", "Boot")).toBe(
      'Opened scene "Boot" (main.json)',
    );
  });
});

describe("EditorConsole", () => {
  it("appends info entries and notifies listeners", () => {
    const consoleLog = new EditorConsole();
    const listener = vi.fn();
    consoleLog.subscribe(listener);
    consoleLog.logSceneOpened("main", "Boot");
    expect(listener).toHaveBeenCalledOnce();
    const [entry] = consoleLog.getEntries();
    expect(entry?.category).toBe(EDITOR_CONSOLE_CATEGORY_SCENE);
    expect(entry?.event).toBe(EDITOR_CONSOLE_EVENT_SCENE_OPENED);
    expect(entry?.level).toBe("info");
    expect(entry?.message).toBe('Opened scene "Boot" (main.json)');
  });

  it("drops oldest entries when the buffer is full", () => {
    const consoleLog = new EditorConsole(2);
    consoleLog.log({ category: "scene", message: "a" });
    consoleLog.log({ category: "scene", message: "b" });
    consoleLog.log({ category: "scene", message: "c" });
    expect(consoleLog.getEntries().map((entry) => entry.message)).toEqual([
      "b",
      "c",
    ]);
  });

  it("clear removes entries once", () => {
    const consoleLog = new EditorConsole();
    const listener = vi.fn();
    consoleLog.subscribe(listener);
    consoleLog.log({ category: "scene", message: "a" });
    consoleLog.clear();
    consoleLog.clear();
    expect(consoleLog.getEntries()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe("Editor scene console events", () => {
  it("logs scene.opened when a scene file is loaded", async () => {
    const editor = new Editor({
      scene: createEmptyScene("Old"),
      sceneFileId: "old",
      sceneApi: sceneApi((id) =>
        id === "boot" ? createEmptyScene("Boot") : createEmptyScene("Old"),
      ),
    });
    expect(editor.console.getEntries()).toEqual([]);
    await editor.loadScene("boot");
    const [entry] = editor.console.getEntries();
    expect(entry?.event).toBe(EDITOR_CONSOLE_EVENT_SCENE_OPENED);
    expect(entry?.message).toBe('Opened scene "Boot" (boot.json)');
    expect(editor.getSceneFileId()).toBe("boot");
  });
});
