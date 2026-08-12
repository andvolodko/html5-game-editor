import { describe, expect, it } from "vitest";
import {
  createLocalStorageEditorSettings,
  DEFAULT_SCENE_VIEW_SETTINGS,
  EDITOR_LAYOUT_VERSION,
  EDITOR_SCENE_VIEW_VERSION,
  isPersistedEditorLayout,
  isPersistedSceneViewSettings,
  normalizeSceneViewSettings,
} from "./editor-settings-storage";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
    key() {
      return null;
    },
  };
}

describe("editor settings storage", () => {
  it("saves and loads versioned layout", () => {
    const storage = createLocalStorageEditorSettings(memoryStorage());
    expect(storage.loadLayout()).toBeNull();
    storage.saveLayout({ version: EDITOR_LAYOUT_VERSION, data: { grid: 1 } });
    expect(storage.loadLayout()).toEqual({
      version: EDITOR_LAYOUT_VERSION,
      data: { grid: 1 },
    });
  });

  it("rejects malformed JSON and unsupported versions", () => {
    const mem = memoryStorage();
    mem.setItem("game-editor:layout:v1", "{not-json");
    const storage = createLocalStorageEditorSettings(mem);
    expect(storage.loadLayout()).toBeNull();

    mem.setItem(
      "game-editor:layout:v1",
      JSON.stringify({ version: 99, data: {} }),
    );
    expect(storage.loadLayout()).toBeNull();

    mem.setItem(
      "game-editor:layout:v1",
      JSON.stringify({ version: 1, data: {} }),
    );
    expect(storage.loadLayout()).toBeNull();
  });

  it("clears layout", () => {
    const storage = createLocalStorageEditorSettings(memoryStorage());
    storage.saveLayout({ version: EDITOR_LAYOUT_VERSION, data: {} });
    storage.clearLayout();
    expect(storage.loadLayout()).toBeNull();
  });

  it("validates persisted shape", () => {
    expect(
      isPersistedEditorLayout({ version: EDITOR_LAYOUT_VERSION, data: null }),
    ).toBe(true);
    expect(isPersistedEditorLayout({ version: "1" })).toBe(false);
    expect(isPersistedEditorLayout(null)).toBe(false);
  });

  it("defaults scene view settings when empty or invalid", () => {
    const mem = memoryStorage();
    const storage = createLocalStorageEditorSettings(mem);
    expect(storage.loadSceneView()).toEqual(DEFAULT_SCENE_VIEW_SETTINGS);

    mem.setItem("game-editor:scene-view:v1", "{bad");
    expect(storage.loadSceneView()).toEqual(DEFAULT_SCENE_VIEW_SETTINGS);

    mem.setItem(
      "game-editor:scene-view:v1",
      JSON.stringify({ version: 99, snapToGrid: true }),
    );
    expect(storage.loadSceneView()).toEqual(DEFAULT_SCENE_VIEW_SETTINGS);
  });

  it("saves and loads snap preferences", () => {
    const storage = createLocalStorageEditorSettings(memoryStorage());
    storage.saveSceneView({
      version: EDITOR_SCENE_VIEW_VERSION,
      snapToGrid: true,
      snapGridSize: 8,
    });
    expect(storage.loadSceneView()).toEqual({
      version: EDITOR_SCENE_VIEW_VERSION,
      snapToGrid: true,
      snapGridSize: 8,
    });
  });

  it("migrates v1 scene view prefs and keeps snap enabled state", () => {
    const mem = memoryStorage();
    mem.setItem(
      "game-editor:scene-view:v1",
      JSON.stringify({ version: 1, snapToGrid: true }),
    );
    const storage = createLocalStorageEditorSettings(mem);
    expect(storage.loadSceneView()).toEqual({
      version: EDITOR_SCENE_VIEW_VERSION,
      snapToGrid: true,
      snapGridSize: DEFAULT_SCENE_VIEW_SETTINGS.snapGridSize,
    });
  });

  it("validates scene view shape", () => {
    expect(
      isPersistedSceneViewSettings({
        version: EDITOR_SCENE_VIEW_VERSION,
        snapToGrid: false,
        snapGridSize: 1,
      }),
    ).toBe(true);
    expect(
      isPersistedSceneViewSettings({
        version: EDITOR_SCENE_VIEW_VERSION,
        snapToGrid: true,
      }),
    ).toBe(false);
    expect(
      normalizeSceneViewSettings({
        version: 1,
        snapToGrid: false,
      }),
    ).toEqual({
      version: EDITOR_SCENE_VIEW_VERSION,
      snapToGrid: false,
      snapGridSize: DEFAULT_SCENE_VIEW_SETTINGS.snapGridSize,
    });
    expect(isPersistedSceneViewSettings(null)).toBe(false);
  });
});
