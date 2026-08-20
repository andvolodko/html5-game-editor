/**
 * Editor UI settings (layout, scene view prefs). Not project/scene data.
 * Global across projects for this MVP (not keyed by project path).
 */

import {
  clampSnapGridSize,
  DEFAULT_SNAP_GRID_SIZE,
} from "@game-editor/renderer-pixi";

export const EDITOR_LAYOUT_STORAGE_KEY = "game-editor:layout:v1";
/** Bump when default panel set / ids change so stale layouts are discarded. */
export const EDITOR_LAYOUT_VERSION = 9 as const;

export const EDITOR_SCENE_VIEW_STORAGE_KEY = "game-editor:scene-view:v1";
/** Bump when scene-view preference shape changes incompatibly. */
export const EDITOR_SCENE_VIEW_VERSION = 2 as const;

export interface PersistedEditorLayout {
  version: typeof EDITOR_LAYOUT_VERSION;
  /** Opaque dockview `toJSON()` payload. */
  data: unknown;
}

export interface PersistedSceneViewSettings {
  version: typeof EDITOR_SCENE_VIEW_VERSION;
  /** When true, node moves / drops quantize to the snap grid. */
  snapToGrid: boolean;
  /** World-space snap cell size in pixels. */
  snapGridSize: number;
}

export const DEFAULT_SCENE_VIEW_SETTINGS: PersistedSceneViewSettings = {
  version: EDITOR_SCENE_VIEW_VERSION,
  snapToGrid: false,
  snapGridSize: DEFAULT_SNAP_GRID_SIZE,
};

export interface EditorSettingsStorage {
  loadLayout(): PersistedEditorLayout | null;
  saveLayout(layout: PersistedEditorLayout): void;
  clearLayout(): void;
  loadSceneView(): PersistedSceneViewSettings;
  saveSceneView(settings: PersistedSceneViewSettings): void;
}

export function createLocalStorageEditorSettings(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = globalThis.localStorage,
  layoutKey = EDITOR_LAYOUT_STORAGE_KEY,
  sceneViewKey = EDITOR_SCENE_VIEW_STORAGE_KEY,
): EditorSettingsStorage {
  return {
    loadLayout() {
      try {
        const raw = storage.getItem(layoutKey);
        if (!raw) {
          return null;
        }
        const parsed: unknown = JSON.parse(raw);
        if (!isPersistedEditorLayout(parsed)) {
          return null;
        }
        if (parsed.version !== EDITOR_LAYOUT_VERSION) {
          return null;
        }
        return parsed;
      } catch {
        return null;
      }
    },

    saveLayout(layout) {
      storage.setItem(layoutKey, JSON.stringify(layout));
    },

    clearLayout() {
      storage.removeItem(layoutKey);
    },

    loadSceneView() {
      try {
        const raw = storage.getItem(sceneViewKey);
        if (!raw) {
          return { ...DEFAULT_SCENE_VIEW_SETTINGS };
        }
        const parsed: unknown = JSON.parse(raw);
        const normalized = normalizeSceneViewSettings(parsed);
        return normalized ?? { ...DEFAULT_SCENE_VIEW_SETTINGS };
      } catch {
        return { ...DEFAULT_SCENE_VIEW_SETTINGS };
      }
    },

    saveSceneView(settings) {
      storage.setItem(
        sceneViewKey,
        JSON.stringify({
          version: EDITOR_SCENE_VIEW_VERSION,
          snapToGrid: settings.snapToGrid,
          snapGridSize: clampSnapGridSize(settings.snapGridSize),
        }),
      );
    },
  };
}

export function isPersistedEditorLayout(
  value: unknown,
): value is PersistedEditorLayout {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as { version?: unknown; data?: unknown };
  return typeof record.version === "number" && "data" in record;
}

export function isPersistedSceneViewSettings(
  value: unknown,
): value is PersistedSceneViewSettings {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as {
    version?: unknown;
    snapToGrid?: unknown;
    snapGridSize?: unknown;
  };
  return (
    record.version === EDITOR_SCENE_VIEW_VERSION &&
    typeof record.snapToGrid === "boolean" &&
    typeof record.snapGridSize === "number" &&
    Number.isFinite(record.snapGridSize)
  );
}

/**
 * Accept current v2 payloads and migrate v1 `{ snapToGrid }` prefs.
 */
export function normalizeSceneViewSettings(
  value: unknown,
): PersistedSceneViewSettings | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as {
    version?: unknown;
    snapToGrid?: unknown;
    snapGridSize?: unknown;
  };
  if (typeof record.snapToGrid !== "boolean") {
    return null;
  }
  if (record.version === EDITOR_SCENE_VIEW_VERSION) {
    if (typeof record.snapGridSize !== "number") {
      return null;
    }
    return {
      version: EDITOR_SCENE_VIEW_VERSION,
      snapToGrid: record.snapToGrid,
      snapGridSize: clampSnapGridSize(record.snapGridSize),
    };
  }
  // v1: checkbox only — keep enabled state, fill default grid size.
  if (record.version === 1) {
    return {
      version: EDITOR_SCENE_VIEW_VERSION,
      snapToGrid: record.snapToGrid,
      snapGridSize: DEFAULT_SNAP_GRID_SIZE,
    };
  }
  return null;
}

/** Stable dock panel component / panel ids. */
export const EDITOR_PANEL_IDS = {
  hierarchy: "hierarchy",
  scene: "scene",
  assets: "assets",
  inspector: "inspector",
  projectSettings: "projectSettings",
  assetPreview: "assetPreview",
  console: "console",
  preview: "preview",
  states: "states",
} as const;

export type EditorPanelId =
  (typeof EDITOR_PANEL_IDS)[keyof typeof EDITOR_PANEL_IDS];
