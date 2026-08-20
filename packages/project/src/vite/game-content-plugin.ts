import { createReadStream, cpSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

const ASSETS_ENTRY = "assets";
const GENERATED_ENTRY = ".generated";
/** Dist / HTTP name: Android WebView cannot serve hidden `.generated/` paths. */
const PUBLIC_GENERATED_ENTRY = "_generated";
const GAME_CONTENT_ENTRIES = [ASSETS_ENTRY, GENERATED_ENTRY] as const;
const GENERATED_TRASH_FOLDERS = ["asset-trash", "folder-trash"] as const;

/**
 * Copies project content folders into the Vite build output so production
 * hosts can serve textures/spine/generated spritesheets at the same paths
 * as AssetDatabase.
 *
 * Bundled JS goes to `bundle/` (not `assets/`) to avoid colliding with
 * game content under `assets/`. Derived Aseprite sheets are published as
 * `_generated/` (not `.generated/`) so Capacitor/Android can fetch them.
 */
export function gameContentPlugin(gameRoot = process.cwd()): Plugin {
  return {
    name: "game-content",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!servePublicGenerated(gameRoot, req, res)) {
          next();
        }
      });
    },
    closeBundle() {
      const outDir = path.resolve(gameRoot, "dist");
      for (const entry of GAME_CONTENT_ENTRIES) {
        const source = path.join(gameRoot, entry);
        if (!existsSync(source)) {
          continue;
        }
        const destName = entry === GENERATED_ENTRY ? PUBLIC_GENERATED_ENTRY : entry;
        cpSync(source, path.join(outDir, destName), {
          recursive: true,
          filter:
            entry === GENERATED_ENTRY
              ? (src) => shouldCopyGeneratedPath(source, src)
              : undefined,
        });
      }
    },
  };
}

/** True when a path under `.generated/` is editor undo trash, not runtime content. */
export function isGeneratedTrashRelative(relativeToGenerated: string): boolean {
  const normalized = relativeToGenerated.replaceAll("\\", "/");
  return GENERATED_TRASH_FOLDERS.some(
    (folder) => normalized === folder || normalized.startsWith(`${folder}/`),
  );
}

function shouldCopyGeneratedPath(generatedRoot: string, src: string): boolean {
  const relative = path.relative(generatedRoot, src);
  return relative === "" || !isGeneratedTrashRelative(relative);
}

function servePublicGenerated(
  gameRoot: string,
  req: IncomingMessage,
  res: ServerResponse,
): boolean {
  const urlPath = req.url?.split("?")[0] ?? "";
  const prefix = `/${PUBLIC_GENERATED_ENTRY}/`;
  if (!urlPath.startsWith(prefix)) {
    return false;
  }
  let relative: string;
  try {
    relative = decodeURIComponent(urlPath.slice(prefix.length));
  } catch {
    res.statusCode = 400;
    res.end();
    return true;
  }
  const generatedRoot = path.resolve(gameRoot, GENERATED_ENTRY);
  const target = path.resolve(generatedRoot, relative);
  const fromRoot = path.relative(generatedRoot, target);
  if (fromRoot.startsWith("..") || path.isAbsolute(fromRoot)) {
    res.statusCode = 403;
    res.end();
    return true;
  }
  if (isGeneratedTrashRelative(fromRoot.replaceAll("\\", "/"))) {
    res.statusCode = 404;
    res.end();
    return true;
  }
  if (!existsSync(target) || !statSync(target).isFile()) {
    res.statusCode = 404;
    res.end();
    return true;
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", contentTypeFor(target));
  createReadStream(target).pipe(res);
  return true;
}

function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".json") {
    return "application/json";
  }
  if (ext === ".png") {
    return "image/png";
  }
  if (ext === ".webp") {
    return "image/webp";
  }
  return "application/octet-stream";
}
