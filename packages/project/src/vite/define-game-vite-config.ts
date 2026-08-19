import { defineConfig, type UserConfig } from "vite";
import { gameContentPlugin } from "./game-content-plugin.js";
import {
  gameBundleLoaderPlugin,
  gameIndexHtmlPlugin,
} from "./game-index-html-plugin.js";

export interface GameViteConfigOptions {
  gameRoot?: string;
  /** Dev-server port. Each game should pick a unique port. */
  port?: number;
  /** Override `<title>`; defaults to `project.json` `displayName`. */
  title?: string;
  /**
   * Public path for the built game. Defaults to `process.env.VITE_BASE`
   * or `./` so zip hosts (itch.io) resolve `bundle/` next to `index.html`.
   * GitHub Pages still sets `VITE_BASE` to `/<repo>/games/<id>/`.
   */
  base?: string;
}

const RELATIVE_GAME_VITE_BASE = "./";

/** `vite.base` from `VITE_BASE`, or `./` for local / zip / preview builds. */
export function resolveGameViteBase(
  envBase: string | undefined = process.env.VITE_BASE,
): string {
  if (envBase === undefined || envBase === "") {
    return RELATIVE_GAME_VITE_BASE;
  }
  return envBase;
}

/**
 * Shared Vite config for `games/*`: shared index.html template, hashed JS
 * under `bundle/`, and copied `assets/` next to the build.
 *
 * Game scripts must use `vite --configLoader runner` so `vite.config.ts`
 * can import this TypeScript module from `@game-editor/project/vite`.
 */
export function defineGameViteConfig(
  options: GameViteConfigOptions = {},
): UserConfig {
  const gameRoot = options.gameRoot ?? process.cwd();
  return defineConfig({
    base: options.base ?? resolveGameViteBase(),
    ...(options.port === undefined ? {} : { server: { port: options.port } }),
    build: {
      outDir: "dist",
      assetsDir: "bundle",
    },
    plugins: [
      gameIndexHtmlPlugin({ gameRoot, title: options.title }),
      gameBundleLoaderPlugin(),
      gameContentPlugin(gameRoot),
    ],
  });
}
