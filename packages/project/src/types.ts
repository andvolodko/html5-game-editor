import type { RendererKind } from "@game-editor/core";
import type { AndroidBuildSettings } from "./android-build-settings.js";

export type {
  AndroidBuildSettings,
  AndroidOrientation,
} from "./android-build-settings.js";
export {
  ANDROID_APPLICATION_ID_PATTERN,
  ANDROID_ICON_RECOMMENDED_SIZE,
  ANDROID_SPLASH_RECOMMENDED_SIZE,
  DEFAULT_ANDROID_FULLSCREEN,
  DEFAULT_ANDROID_IMMERSIVE_MODE,
  DEFAULT_ANDROID_KEEP_SCREEN_AWAKE,
  DEFAULT_ANDROID_ORIENTATION,
  DEFAULT_ANDROID_VERSION_CODE,
  DEFAULT_ANDROID_VERSION_NAME,
  createDefaultAndroidBuildSettings,
  defaultAndroidApplicationId,
  sanitizeAndroidApplicationIdSegment,
  androidBuildSettingsEqual,
} from "./android-build-settings.js";

/** Current project.json schema version. Bump when persisted shape changes incompatibly. */
export const PROJECT_SCHEMA_VERSION = 1 as const;

/** Default start scene file id when missing from older project.json files. */
export const DEFAULT_START_SCENE = "main";

/** Default design resolution when missing from older project.json files. */
export const DEFAULT_PROJECT_RESOLUTION: ProjectResolution = {
  width: 1280,
  height: 720,
};

/**
 * Default clear / letterbox color (CSS `#RRGGBB`).
 * Used for the game host background and Pixi Application clear color.
 * `#RRGGBBAA` is also valid when a transparent clear is needed.
 */
export const DEFAULT_PROJECT_BACKGROUND = "#0b0d12";

/**
 * How the design resolution maps onto the game window.
 * `expand` fits the design (uniform scale, centered) and lets Pixi fill leftover
 * bands. `cover` crops to fill. `contain` letterboxes.
 */
export type ProjectScaleMode = "contain" | "cover" | "expand";

/** Default scale mode when missing from older project.json files. */
export const DEFAULT_PROJECT_SCALE_MODE: ProjectScaleMode = "expand";

export function resolveProjectScaleMode(
  value: ProjectScaleMode | undefined,
): ProjectScaleMode {
  if (value === "contain" || value === "cover" || value === "expand") {
    return value;
  }
  return DEFAULT_PROJECT_SCALE_MODE;
}

/** Design resolution in world/CSS-independent pixels. */
export interface ProjectResolution {
  width: number;
  height: number;
}

/**
 * Root project manifest (`project.json`).
 * `startScene` is a scene file id (basename under assets/scenes/), not an asset id.
 */
export interface ProjectData {
  name: string;
  version: number;
  displayName: string;
  renderers: RendererKind[];
  startScene: string;
  resolution: ProjectResolution;
  /**
   * CSS fit of the design buffer in the game window / Preview.
   * Parse fills {@link DEFAULT_PROJECT_SCALE_MODE} when omitted.
   * `expand` keeps the design centered and fills leftover window with Pixi.
   */
  scaleMode: ProjectScaleMode;
  /** CSS `#RRGGBB` or `#RRGGBBAA` clear / letterbox color. */
  background: string;
  /**
   * Optional Android packaging settings. Omitted on older projects;
   * parse applies defaults when missing.
   */
  android?: AndroidBuildSettings;
}

/**
 * Discoverable game under the games workspace (folder id, not a filesystem path).
 * Returned by project-server `GET /projects` for editor project pickers.
 */
export interface ProjectListEntry {
  id: string;
  name: string;
  displayName: string;
  renderers: RendererKind[];
}
