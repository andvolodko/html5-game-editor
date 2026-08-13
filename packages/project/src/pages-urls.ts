/** Directory under the GitHub Pages root that holds standalone game builds. */
export const STANDALONE_GAMES_SEGMENT = "games";

/** Ensures a public base ends with `/`, except the site root stays `/`. */
export function normalizePublicBaseUrl(baseUrl: string): string {
  if (baseUrl === "" || baseUrl === "/") {
    return "/";
  }
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
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
