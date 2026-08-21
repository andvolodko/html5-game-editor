export type {
  ProjectData,
  ProjectListEntry,
  ProjectResolution,
  ProjectScaleMode,
  AndroidBuildSettings,
  AndroidOrientation,
} from "./types.js";
export {
  PROJECT_SCHEMA_VERSION,
  DEFAULT_START_SCENE,
  DEFAULT_PROJECT_RESOLUTION,
  DEFAULT_PROJECT_SCALE_MODE,
  resolveProjectScaleMode,
  DEFAULT_PROJECT_BACKGROUND,
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
} from "./types.js";
export {
  parseProjectData,
  serializeProjectData,
  isCurrentProjectSchemaVersion,
  PROJECT_SCENE_ID_PATTERN,
  PROJECT_ID_PATTERN,
  rendererKindSchema,
  projectDataSchema,
  projectResolutionSchema,
  projectScaleModeSchema,
  projectBackgroundSchema,
  androidBuildSettingsSchema,
  androidOrientationSchema,
} from "./schema.js";
export type { ProjectBackgroundClear } from "./project-background.js";
export {
  PROJECT_BACKGROUND_HEX_PATTERN,
  OPAQUE_PROJECT_BACKGROUND_ALPHA,
  PROJECT_BACKGROUND_ALPHA_MIN,
  PROJECT_BACKGROUND_ALPHA_MAX,
  normalizeProjectBackgroundHex,
  projectBackgroundRgbHex,
  composeProjectBackgroundHex,
  projectBackgroundToPixiColor,
  projectBackgroundToPixiAlpha,
  projectBackgroundToClear,
  projectBackgroundRendererClear,
} from "./project-background.js";
export type { FittedRect, ExpandedFit, PlaybackCameraFit } from "./fit-contain-rect.js";
export {
  fitContainRect,
  fitCoverRect,
  fitExpandRect,
  fitDesignRect,
  integerExpandBuffer,
  playbackCameraForParent,
} from "./fit-contain-rect.js";
export {
  writeGameLayoutSize,
  readGameLayoutSizeFromDataset,
  measurePlaybackParentSize,
} from "./game-layout-size.js";
export type { LayoutSize } from "./game-layout-size.js";
export {
  GAME_MOUNT_ELEMENT_ID,
  GAME_LOADING_ELEMENT_ID,
  GAME_ENTRY_MODULE_SRC,
  DEFAULT_GAME_INDEX_TITLE,
} from "./game-shell.js";
export {
  STANDALONE_GAMES_SEGMENT,
  normalizePublicBaseUrl,
  standaloneGameBaseUrl,
  standaloneGamesIndexUrl,
} from "./pages-urls.js";
