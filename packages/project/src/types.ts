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
 */
export const DEFAULT_PROJECT_BACKGROUND = "#0b0d12";

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
  /** CSS `#RRGGBB` clear / letterbox color. */
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
