import { describe, expect, it } from "vitest";
import { GAME_ENTRY_URL_PLACEHOLDER } from "../game-shell.js";
import { injectGameBundleLoader } from "./inject-game-bundle-loader.js";

const loaderSnippet = `var entryUrl = "${GAME_ENTRY_URL_PLACEHOLDER}";`;

describe("injectGameBundleLoader", () => {
  it("points the inline loader at the hashed entry and removes the src script", () => {
    const html = `<!doctype html>
<html>
  <head>
    <script type="module" crossorigin src="/bundle/index-abc.js"></script>
  </head>
  <body>
    <p id="game-loading">Loading <span id="game-loading-percent">0</span>%</p>
    <script>${loaderSnippet}</script>
  </body>
</html>`;

    const next = injectGameBundleLoader(html);
    expect(next).not.toContain('src="/bundle/index-abc.js"');
    expect(next).toContain('var entryUrl = "/bundle/index-abc.js";');
    expect(next).toContain("game-loading");
  });

  it("strips modulepreload for the entry so progress is a single download", () => {
    const html = `<!doctype html>
<html>
  <head>
    <link rel="modulepreload" href="/bundle/index-abc.js">
    <script type="module" src="/bundle/index-abc.js"></script>
  </head>
  <body>
    <script>${loaderSnippet}</script>
  </body>
</html>`;

    const next = injectGameBundleLoader(html);
    expect(next).not.toContain("modulepreload");
    expect(next).toContain('var entryUrl = "/bundle/index-abc.js";');
  });

  it("leaves @vite/client scripts alone", () => {
    const html = `<!doctype html>
<html>
  <body>
    <script type="module" src="/@vite/client"></script>
    <script type="module" src="/src/main.ts"></script>
    <script>${loaderSnippet}</script>
  </body>
</html>`;

    const next = injectGameBundleLoader(html);
    expect(next).toContain('src="/@vite/client"');
    expect(next).not.toContain('src="/src/main.ts"');
    expect(next).toContain('var entryUrl = "/src/main.ts";');
  });
});
