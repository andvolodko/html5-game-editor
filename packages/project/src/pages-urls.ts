/** Directory under the GitHub Pages root that holds standalone game builds. */
export const STANDALONE_GAMES_SEGMENT = "games";

/**
 * Relative Vite `base` so hashed JS/CSS resolve next to `index.html`.
 * Required when `dist` is served from a subdirectory (or a zip host).
 */
export const RELATIVE_PUBLIC_VITE_BASE = "./";

/** Ensures a public base ends with `/`, except the site root stays `/`. */
export function normalizePublicBaseUrl(baseUrl: string): string {
  if (baseUrl === "" || baseUrl === "/") {
    return "/";
  }
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

/**
 * Vite `base` from `VITE_BASE`, or `./` when unset so the build works at the
 * site root and under a subdirectory without rebuilding.
 */
export function resolveViteBase(envBase: string | undefined): string {
  if (envBase === undefined || envBase === "") {
    return RELATIVE_PUBLIC_VITE_BASE;
  }
  return envBase;
}

/** Vite `base` / asset prefix for a playable game on GitHub Pages. */
export function standaloneGameBaseUrl(
  pagesBase: string,
  gameId: string,
): string {
  return `${normalizePublicBaseUrl(pagesBase)}${STANDALONE_GAMES_SEGMENT}/${gameId}/`;
}

/** Index of every playable game copied next to the editor demo. */
export function standaloneGamesIndexUrl(pagesBase: string): string {
  return `${normalizePublicBaseUrl(pagesBase)}${STANDALONE_GAMES_SEGMENT}/`;
}
