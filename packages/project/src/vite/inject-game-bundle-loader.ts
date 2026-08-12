import { GAME_ENTRY_URL_PLACEHOLDER } from "../game-shell.js";

const SCRIPT_TAG_PATTERN = /<script\b[^>]*><\/script>/gi;
const MODULEPRELOAD_PATTERN =
  /<link\b[^>]*rel=["']modulepreload["'][^>]*>/gi;

function readAttr(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`));
  return match?.[1];
}

function isViteRuntimeSrc(src: string): boolean {
  return src.includes("@vite/");
}

export function findGameEntryScript(
  html: string,
): { tag: string; src: string } | undefined {
  for (const match of html.matchAll(SCRIPT_TAG_PATTERN)) {
    const tag = match[0];
    if (readAttr(tag, "type") !== "module") {
      continue;
    }
    const src = readAttr(tag, "src");
    if (src === undefined || isViteRuntimeSrc(src)) {
      continue;
    }
    return { tag, src };
  }
  return undefined;
}

function stripEntryModulepreload(html: string, entrySrc: string): string {
  return html.replace(MODULEPRELOAD_PATTERN, (tag) => {
    const href = readAttr(tag, "href");
    return href === entrySrc ? "" : tag;
  });
}

/**
 * Removes Vite's auto-loaded entry `<script type="module" src>` and fills
 * `__GAME_ENTRY_URL__` in the inline loader so download progress is visible.
 * The loader then `import()`s the same URL so relative chunks still resolve.
 */
export function injectGameBundleLoader(html: string): string {
  const entry = findGameEntryScript(html);
  if (entry === undefined) {
    return html;
  }
  if (!html.includes(`"${GAME_ENTRY_URL_PLACEHOLDER}"`)) {
    throw new Error("index.html template missing entry URL placeholder");
  }
  const withoutEntry = stripEntryModulepreload(
    html.replace(entry.tag, ""),
    entry.src,
  );
  return withoutEntry.replaceAll(
    `"${GAME_ENTRY_URL_PLACEHOLDER}"`,
    JSON.stringify(entry.src),
  );
}
