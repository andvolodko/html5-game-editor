import type { RendererKind } from "@game-editor/core";

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
