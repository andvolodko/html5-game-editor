import { cpSync, existsSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

const GAME_CONTENT_ENTRIES = ["assets", ".generated"] as const;

/**
 * Copies project content folders into the Vite build output so production
 * hosts can serve textures/spine/generated spritesheets at the same paths
 * as AssetDatabase.
 *
 * Bundled JS goes to `bundle/` (not `assets/`) to avoid colliding with
 * game content under `assets/`.
 */
export function gameContentPlugin(gameRoot = process.cwd()): Plugin {
  return {
    name: "game-content",
    apply: "build",
    closeBundle() {
      const outDir = path.resolve(gameRoot, "dist");
      for (const entry of GAME_CONTENT_ENTRIES) {
        const source = path.join(gameRoot, entry);
        if (!existsSync(source)) {
          continue;
        }
        cpSync(source, path.join(outDir, entry), { recursive: true });
      }
    },
  };
}
