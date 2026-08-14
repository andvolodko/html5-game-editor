import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import {
  DEFAULT_GAME_INDEX_TITLE,
  renderGameIndexHtml,
} from "../game-shell.js";
import { DEFAULT_PROJECT_BACKGROUND } from "../types.js";
import { parseProjectData } from "../schema.js";
import { injectGameBundleLoader } from "./inject-game-bundle-loader.js";
import { loadGameIndexHtmlTemplate } from "./load-game-index-html-template.js";

export interface GameIndexHtmlPluginOptions {
  gameRoot?: string;
  title?: string;
}

interface GameShellFields {
  title: string;
  background: string;
  faviconLinks: string;
}

const FAVICON_LINK_TAGS: ReadonlyArray<{ file: string; tag: string }> = [
  {
    file: "favicon.svg",
    tag: '<link rel="icon" href="./favicon.svg" type="image/svg+xml" />',
  },
  {
    file: "favicon.png",
    tag: '<link rel="icon" href="./favicon.png" type="image/png" sizes="32x32" />',
  },
  {
    file: "favicon.ico",
    tag: '<link rel="icon" href="./favicon.ico" sizes="any" />',
  },
  {
    file: "apple-touch-icon.png",
    tag: '<link rel="apple-touch-icon" href="./apple-touch-icon.png" />',
  },
];

function readFaviconLinks(gameRoot: string): string {
  const publicDir = path.join(gameRoot, "public");
  const links: string[] = [];
  for (const entry of FAVICON_LINK_TAGS) {
    if (existsSync(path.join(publicDir, entry.file))) {
      links.push(entry.tag);
    }
  }
  return links.join("\n    ");
}

function readGameShellFields(
  gameRoot: string,
  titleOverride: string | undefined,
): GameShellFields {
  const projectPath = path.join(gameRoot, "project.json");
  const faviconLinks = readFaviconLinks(gameRoot);
  if (!existsSync(projectPath)) {
    return {
      title: titleOverride ?? DEFAULT_GAME_INDEX_TITLE,
      background: DEFAULT_PROJECT_BACKGROUND,
      faviconLinks,
    };
  }
  const raw: unknown = JSON.parse(readFileSync(projectPath, "utf8"));
  const project = parseProjectData(raw);
  return {
    title: titleOverride ?? project.displayName,
    background: project.background,
    faviconLinks,
  };
}

function applyGameIndexTemplate(options: GameIndexHtmlPluginOptions): string {
  const gameRoot = options.gameRoot ?? process.cwd();
  const shell = readGameShellFields(gameRoot, options.title);
  return renderGameIndexHtml(loadGameIndexHtmlTemplate(), {
    title: shell.title,
    background: shell.background,
    faviconLinks: shell.faviconLinks,
  });
}

/**
 * Replaces each game's Vite `index.html` entry with the shared template.
 * `<title>` comes from `project.json` `displayName` unless `title` is set.
 */
export function gameIndexHtmlPlugin(
  options: GameIndexHtmlPluginOptions = {},
): Plugin {
  return {
    name: "game-index-html",
    transformIndexHtml: {
      order: "pre",
      handler() {
        return applyGameIndexTemplate(options);
      },
    },
  };
}

/**
 * After Vite rewrites the entry script to the hashed bundle, point the inline
 * loader at that URL and stop the browser from auto-loading the module.
 */
export function gameBundleLoaderPlugin(): Plugin {
  return {
    name: "game-bundle-loader",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        return injectGameBundleLoader(html);
      },
    },
  };
}
