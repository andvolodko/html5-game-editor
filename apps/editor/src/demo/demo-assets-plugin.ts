/// <reference types="node" />
import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin, ResolvedConfig } from "vite";

const DEMO_URL_PREFIX = "/demo/";
const ASSETS_SEGMENT = "/assets/";
const FORBIDDEN_STATUS = 403;
const NOT_FOUND_STATUS = 404;
const PROJECT_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

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

function parseDemoAssetUrl(
  pathname: string,
): { projectId: string; relative: string } | undefined {
  if (!pathname.startsWith(DEMO_URL_PREFIX)) {
    return undefined;
  }
  const rest = pathname.slice(DEMO_URL_PREFIX.length);
  const assetsAt = rest.indexOf(ASSETS_SEGMENT);
  if (assetsAt <= 0) {
    return undefined;
  }
  const projectId = rest.slice(0, assetsAt);
  if (!PROJECT_ID_PATTERN.test(projectId)) {
    return undefined;
  }
  return {
    projectId,
    relative: rest.slice(assetsAt + ASSETS_SEGMENT.length),
  };
}

function sendFile(res: ServerResponse, filePath: string): void {
  res.statusCode = 200;
  res.setHeader("Content-Type", mimeForFile(filePath));
  fs.createReadStream(filePath).pipe(res);
}

function listDemoGames(
  gamesRoot: string,
): Array<{ id: string; assetsRoot: string }> {
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
      assetsRoot: path.join(gamesRoot, entry.name, "assets"),
    }))
    .filter((game) => fs.existsSync(game.assetsRoot));
}

function demoAssetsMiddleware(gamesRoot: string, base: string) {
  const games = new Map(
    listDemoGames(gamesRoot).map((game) => [game.id, path.resolve(game.assetsRoot)]),
  );
  return (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
    const rawUrl = req.url ?? "";
    const pathname = stripViteBase(
      decodeURIComponent(rawUrl.split("?")[0] ?? ""),
      base,
    );
    const parsed = parseDemoAssetUrl(pathname);
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
 * Serves / copies each `games/<id>/assets` tree to `/demo/<id>/assets`
 * so the editor can switch projects without project-server.
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
        const dest = path.resolve(outDir, "demo", game.id, "assets");
        fs.mkdirSync(dest, { recursive: true });
        fs.cpSync(game.assetsRoot, dest, { recursive: true });
      }
      copyIndexTo404(outDir);
    },
  };
}
