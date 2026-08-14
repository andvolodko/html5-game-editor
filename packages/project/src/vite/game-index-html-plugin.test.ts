import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { IndexHtmlTransformContext, IndexHtmlTransformHook } from "vite";
import {
  DEFAULT_PROJECT_BACKGROUND,
  PROJECT_SCHEMA_VERSION,
  type ProjectData,
} from "../types.js";
import { gameIndexHtmlPlugin } from "./game-index-html-plugin.js";

const validProject: ProjectData = {
  name: "temp-game",
  version: PROJECT_SCHEMA_VERSION,
  displayName: "Temp Display",
  renderers: ["pixi"],
  startScene: "main",
  resolution: { width: 1280, height: 720 },
  background: DEFAULT_PROJECT_BACKGROUND,
};

function applyIndexHtmlPlugin(
  plugin: ReturnType<typeof gameIndexHtmlPlugin>,
): string {
  const hook = plugin.transformIndexHtml;
  if (hook === undefined || typeof hook === "function") {
    throw new Error("expected transformIndexHtml object hook");
  }
  const handler: IndexHtmlTransformHook = hook.handler;
  const result = handler("", {} as IndexHtmlTransformContext);
  if (typeof result !== "string") {
    throw new Error("expected HTML string from transformIndexHtml");
  }
  return result;
}

describe("gameIndexHtmlPlugin", () => {
  it("uses project.json displayName for <title>", () => {
    const gameRoot = mkdtempSync(path.join(tmpdir(), "game-index-html-"));
    writeFileSync(
      path.join(gameRoot, "project.json"),
      JSON.stringify(validProject),
    );

    const html = applyIndexHtmlPlugin(gameIndexHtmlPlugin({ gameRoot }));
    expect(html).toContain("<title>Temp Display</title>");
    expect(html).toContain('id="app"');
    expect(html).toContain('id="game-loading"');
    expect(html).toContain("background: #0b0d12");
    expect(html).toContain('src="/src/main.ts"');
  });

  it("prefers an explicit title over project.json", () => {
    const gameRoot = mkdtempSync(path.join(tmpdir(), "game-index-html-"));
    writeFileSync(
      path.join(gameRoot, "project.json"),
      JSON.stringify(validProject),
    );

    const html = applyIndexHtmlPlugin(
      gameIndexHtmlPlugin({ gameRoot, title: "Forced Title" }),
    );
    expect(html).toContain("<title>Forced Title</title>");
    expect(html).not.toContain("Temp Display");
  });

  it("uses the default title when project.json is missing", () => {
    const gameRoot = mkdtempSync(path.join(tmpdir(), "game-index-html-"));
    const html = applyIndexHtmlPlugin(gameIndexHtmlPlugin({ gameRoot }));
    expect(html).toContain("<title>Game</title>");
    expect(html).not.toContain('rel="icon"');
  });

  it("links favicon files from public/", () => {
    const gameRoot = mkdtempSync(path.join(tmpdir(), "game-index-html-"));
    mkdirSync(path.join(gameRoot, "public"));
    writeFileSync(path.join(gameRoot, "public", "favicon.svg"), "<svg/>");
    writeFileSync(path.join(gameRoot, "public", "favicon.png"), "");
    const html = applyIndexHtmlPlugin(gameIndexHtmlPlugin({ gameRoot }));
    expect(html).toContain(
      '<link rel="icon" href="./favicon.svg" type="image/svg+xml" />',
    );
    expect(html).toContain(
      '<link rel="icon" href="./favicon.png" type="image/png" sizes="32x32" />',
    );
  });
});
