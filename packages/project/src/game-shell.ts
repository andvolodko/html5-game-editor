/** DOM id of the game mount node in the shared index.html template. */
export const GAME_MOUNT_ELEMENT_ID = "app";

/** Overlay shown while the main JS bundle downloads. */
export const GAME_LOADING_ELEMENT_ID = "game-loading";

/** Text node that displays the integer download percent. */
export const GAME_LOADING_PERCENT_ELEMENT_ID = "game-loading-percent";

/** Vite entry script path used by the shared game index.html template. */
export const GAME_ENTRY_MODULE_SRC = "/src/main.ts";

/** Placeholder in `templates/index.html` replaced at Vite transform time. */
export const GAME_INDEX_TITLE_PLACEHOLDER = "{{title}}";

/** Placeholder for `project.json` background in the boot CSS. */
export const GAME_INDEX_BACKGROUND_PLACEHOLDER = "{{background}}";

/** Replaced with a JSON string of the hashed (or dev) entry URL. */
export const GAME_ENTRY_URL_PLACEHOLDER = "__GAME_ENTRY_URL__";

/** Fallback `<title>` when project.json is missing. */
export const DEFAULT_GAME_INDEX_TITLE = "Game";

export interface RenderGameIndexHtmlOptions {
  title: string;
  background: string;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Fills `templates/index.html` placeholders. Does not read the filesystem. */
export function renderGameIndexHtml(
  template: string,
  options: RenderGameIndexHtmlOptions,
): string {
  return template
    .replaceAll(GAME_INDEX_TITLE_PLACEHOLDER, escapeHtml(options.title))
    .replaceAll(
      GAME_INDEX_BACKGROUND_PLACEHOLDER,
      escapeHtml(options.background),
    );
}
