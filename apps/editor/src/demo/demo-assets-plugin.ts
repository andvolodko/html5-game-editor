/// <reference types="node" />
import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin, ResolvedConfig } from "vite";
import {
  isGeneratedTrashRelative,
  parseDemoContentUrl,
} from "./demo-content-paths";

const FORBIDDEN_STATUS = 403;
const NOT_FOUND_STATUS = 404;
const ASSETS_ENTRY = "assets";
const GENERATED_ENTRY = ".generated";

const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".json": "application/json",
  ".atlas": "text/plain",
  ".skel": "application/octet-stream",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
};

function mimeForFile(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXTENSION[ext] ?? "application/octet-stream";
}

function stripViteBase(pathname: string, base: string): string {
  if (base === "/" || base === "") {
    return pathname;
  }
  const prefix = base.endsWith("/") ? base.slice(0, -1) : base;
  if (pathname === prefix) {
    return "/";
  }
  if (pathname.startsWith(`${prefix}/`)) {
    return pathname.slice(prefix.length);
  }
  return pathname;
}

function isInsideRoot(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function sendFile(res: ServerResponse, filePath: string): void {
  res.statusCode = 200;
  res.setHeader("Content-Type", mimeForFile(filePath));
  fs.createReadStream(filePath).pipe(res);
}

function listDemoGames(
  gamesRoot: string,
): Array<{ id: string; projectRoot: string }> {
  if (!fs.existsSync(gamesRoot)) {
    return [];
  }
  return fs
    .readdirSync(gamesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) =>
      fs.existsSync(path.join(gamesRoot, entry.name, "project.json")),
    )
    .map((entry) => ({
      id: entry.name,
      projectRoot: path.join(gamesRoot, entry.name),
    }))
    .filter((game) =>
      fs.existsSync(path.join(game.projectRoot, ASSETS_ENTRY)),
    );
}

function copyGeneratedTree(source: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(source, dest, {
    recursive: true,
    filter(src) {
      const relative = path.relative(source, src).replaceAll("\\", "/");
      return relative === "" || !isGeneratedTrashRelative(relative);
    },
  });
}

function demoAssetsMiddleware(gamesRoot: string, base: string) {
  const games = new Map(
    listDemoGames(gamesRoot).map((game) => [game.id, path.resolve(game.projectRoot)]),
  );
  return (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
    const rawUrl = req.url ?? "";
    const pathname = stripViteBase(
      decodeURIComponent(rawUrl.split("?")[0] ?? ""),
      base,
    );
    const parsed = parseDemoContentUrl(pathname);
    if (!parsed) {
      next();
      return;
    }
    const root = games.get(parsed.projectId);
    if (!root) {
      res.statusCode = NOT_FOUND_STATUS;
      res.end();
      return;
    }
    const resolved = path.resolve(root, parsed.relative);
    if (!isInsideRoot(root, resolved)) {
      res.statusCode = FORBIDDEN_STATUS;
      res.end();
      return;
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      res.statusCode = NOT_FOUND_STATUS;
      res.end();
      return;
    }
    sendFile(res, resolved);
  };
}

function copyIndexTo404(outDir: string): void {
  const indexPath = path.resolve(outDir, "index.html");
  if (fs.existsSync(indexPath)) {
    fs.copyFileSync(indexPath, path.resolve(outDir, "404.html"));
  }
}

/**
 * Serves / copies each game's `assets/` and `.generated/` trees under
 * `/demo/<id>/` so the static editor can switch projects without project-server.
 */
export function demoAssetsPlugin(gamesRoot: string): Plugin {
  let outDir = "dist";
  let base = "/";
  return {
    name: "demo-assets",
    configResolved(config: ResolvedConfig) {
      outDir = config.build.outDir;
      base = config.base;
    },
    configureServer(server) {
      server.middlewares.use(demoAssetsMiddleware(gamesRoot, base));
    },
    configurePreviewServer(server) {
      server.middlewares.use(demoAssetsMiddleware(gamesRoot, base));
    },
    closeBundle() {
      for (const game of listDemoGames(gamesRoot)) {
        const destRoot = path.resolve(outDir, "demo", game.id);
        const assetsSource = path.join(game.projectRoot, ASSETS_ENTRY);
        const assetsDest = path.join(destRoot, ASSETS_ENTRY);
        fs.mkdirSync(assetsDest, { recursive: true });
        fs.cpSync(assetsSource, assetsDest, { recursive: true });
        const generatedSource = path.join(game.projectRoot, GENERATED_ENTRY);
        if (fs.existsSync(generatedSource)) {
          copyGeneratedTree(generatedSource, path.join(destRoot, GENERATED_ENTRY));
        }
      }
      copyIndexTo404(outDir);
    },
  };
}
