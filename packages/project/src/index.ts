export type {
  ProjectData,
  ProjectListEntry,
  ProjectResolution,
} from "./types.js";
export {
  PROJECT_SCHEMA_VERSION,
  DEFAULT_START_SCENE,
  DEFAULT_PROJECT_RESOLUTION,
  DEFAULT_PROJECT_BACKGROUND,
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
  projectBackgroundSchema,
} from "./schema.js";
export {
  PROJECT_BACKGROUND_HEX_PATTERN,
  normalizeProjectBackgroundHex,
  projectBackgroundToPixiColor,
} from "./project-background.js";
export type { FittedRect } from "./fit-contain-rect.js";
export { fitContainRect } from "./fit-contain-rect.js";
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
