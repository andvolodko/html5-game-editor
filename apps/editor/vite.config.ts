import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { demoAssetsPlugin } from "./src/demo/demo-assets-plugin";

/**
 * Keep in sync with `@game-editor/shared` ports.ts.
 * Port numbers stay inlined here; workspace `.ts` imports need
 * `--configLoader runner` (see package.json scripts), which the demo
 * plugin uses for `@game-editor/assets`.
 */
const DEFAULT_EDITOR_DEV_PORT = 5173;
const DEFAULT_PROJECT_SERVER_PORT = 8787;

const here = path.dirname(fileURLToPath(import.meta.url));
const gamesRoot = path.resolve(here, "../../games");
const demoEditorFactory = path.resolve(here, "src/demo/create-demo-editor.ts");

/**
 * Scene / project / asset files written by the editor (Ctrl+S). JSON modules
 * cannot HMR, so watching them full-reloads the browser in live `pnpm dev`.
 * Game `src/` stays watched so script-component HMR still works.
 */
const LIVE_DEV_WATCH_IGNORED = [
  "**/games/**/project.json",
  "**/games/**/.project/**",
  "**/games/**/assets/**",
];

function isLiveEditorFactoryId(id: string): boolean {
  const normalized = id.replaceAll("\\", "/");
  return (
    id === "./create-editor" ||
    id === "./create-editor.ts" ||
    normalized.endsWith("/src/create-editor") ||
    normalized.endsWith("/src/create-editor.ts")
  );
}

/** Demo builds must not load `create-editor.ts` (no project-server clients). */
function demoEditorFactoryPlugin(): Plugin {
  return {
    name: "demo-editor-factory",
    enforce: "pre",
    resolveId(id) {
      if (isLiveEditorFactoryId(id)) {
        return demoEditorFactory;
      }
      return undefined;
    },
  };
}

export default defineConfig(({ mode }) => {
  const demo = mode === "demo" || process.env.VITE_DEMO === "true";
  const base = process.env.VITE_BASE ?? "/";
  return {
    base,
    plugins: [
      react(),
      ...(demo ? [demoEditorFactoryPlugin(), demoAssetsPlugin(gamesRoot)] : []),
    ],
    server: {
      port: DEFAULT_EDITOR_DEV_PORT,
      watch: demo ? undefined : { ignored: LIVE_DEV_WATCH_IGNORED },
      proxy: demo
        ? undefined
        : {
            "/api": {
              target: `http://localhost:${DEFAULT_PROJECT_SERVER_PORT}`,
              changeOrigin: true,
              rewrite: (pathName: string) => pathName.replace(/^\/api/, ""),
            },
          },
    },
  };
});
