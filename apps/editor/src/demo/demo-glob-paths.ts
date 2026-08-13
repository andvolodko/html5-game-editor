/** Folder name under `games/` — keep in sync with `@game-editor/project` PROJECT_ID_PATTERN. */
const GAME_FOLDER_PATTERN = /^[A-Za-z0-9._-]+$/;

const GAMES_SEGMENT = "/games/";

/** Reads `editor-features-demo` from a Vite glob key like `../../../../games/editor-features-demo/project.json`. */
export function projectIdFromGlobPath(modulePath: string): string | undefined {
  const normalized = modulePath.replaceAll("\\", "/");
  const index = normalized.lastIndexOf(GAMES_SEGMENT);
  if (index < 0) {
    return undefined;
  }
  const rest = normalized.slice(index + GAMES_SEGMENT.length);
  const slash = rest.indexOf("/");
  const id = slash < 0 ? rest : rest.slice(0, slash);
  if (!GAME_FOLDER_PATTERN.test(id)) {
    return undefined;
  }
  return id;
}

/** Scene file id from `.../assets/scenes/main.json`. */
export function sceneIdFromGlobPath(modulePath: string): string | undefined {
  const normalized = modulePath.replaceAll("\\", "/");
  const match = /\/assets\/scenes\/([^/]+)\.json$/i.exec(normalized);
  const id = match?.[1];
  if (id === undefined || !GAME_FOLDER_PATTERN.test(id)) {
    return undefined;
  }
  return id;
}
