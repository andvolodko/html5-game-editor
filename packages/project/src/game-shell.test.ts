import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DEFAULT_PROJECT_BACKGROUND } from "./types.js";
import {
  DEFAULT_GAME_INDEX_TITLE,
  GAME_ENTRY_MODULE_SRC,
  GAME_ENTRY_URL_PLACEHOLDER,
  GAME_INDEX_BACKGROUND_PLACEHOLDER,
  GAME_INDEX_FAVICON_PLACEHOLDER,
  GAME_INDEX_TITLE_PLACEHOLDER,
  GAME_LOADING_ELEMENT_ID,
  GAME_LOADING_PERCENT_ELEMENT_ID,
  GAME_MOUNT_ELEMENT_ID,
  renderGameIndexHtml,
} from "./game-shell.js";

const templatePath = fileURLToPath(
  new URL("../templates/index.html", import.meta.url),
);

describe("game index.html template", () => {
  const template = readFileSync(templatePath, "utf8");

  it("inlines boot CSS, loading markup, and the bundle loader", () => {
    expect(template).toContain(`id="${GAME_MOUNT_ELEMENT_ID}"`);
    expect(template).toContain(`id="${GAME_LOADING_ELEMENT_ID}"`);
    expect(template).toContain(`id="${GAME_LOADING_PERCENT_ELEMENT_ID}"`);
    expect(template).toContain("Loading <span id=\"game-loading-percent\">0</span>%");
    expect(template).toContain("user-select: none");
    expect(template).toContain("canvas {");
    expect(template).toContain("fetch(entryUrl)");
    expect(template).toContain(`src="${GAME_ENTRY_MODULE_SRC}"`);
    expect(template).toContain("width=device-width");
    expect(template).toContain("viewport-fit=cover");
    expect(template).toContain("maximum-scale=1.0");
    expect(template).toContain("position: fixed");
    expect(template).toContain(GAME_INDEX_TITLE_PLACEHOLDER);
    expect(template).toContain(GAME_INDEX_BACKGROUND_PLACEHOLDER);
    expect(template).toContain(GAME_INDEX_FAVICON_PLACEHOLDER);
    expect(template).toContain(GAME_ENTRY_URL_PLACEHOLDER);
  });

  it("substitutes an escaped title and background", () => {
    const html = renderGameIndexHtml(template, {
      title: 'Demo <Game> & "Co"',
      background: "#1c2a4a",
    });
    expect(html).toContain("<title>Demo &lt;Game&gt; &amp; &quot;Co&quot;</title>");
    expect(html).toContain("background: #1c2a4a");
    expect(html).not.toContain(GAME_INDEX_TITLE_PLACEHOLDER);
    expect(html).not.toContain(GAME_INDEX_BACKGROUND_PLACEHOLDER);
    expect(html).not.toContain(GAME_INDEX_FAVICON_PLACEHOLDER);
    expect(html).toContain(`id="${GAME_MOUNT_ELEMENT_ID}"`);
  });

  it("keeps the default title token available for missing projects", () => {
    expect(DEFAULT_GAME_INDEX_TITLE).toBe("Game");
    expect(DEFAULT_PROJECT_BACKGROUND).toBe("#0b0d12");
  });
});
