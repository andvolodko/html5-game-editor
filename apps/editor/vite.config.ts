import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Keep in sync with `@game-editor/shared` ports.ts.
 * Vite config cannot import workspace `.ts` package entry points under Node ESM.
 */
const DEFAULT_EDITOR_DEV_PORT = 5173;
const DEFAULT_PROJECT_SERVER_PORT = 8787;

export default defineConfig({
  plugins: [react()],
  server: {
    port: DEFAULT_EDITOR_DEV_PORT,
    proxy: {
      "/api": {
        target: `http://localhost:${DEFAULT_PROJECT_SERVER_PORT}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
