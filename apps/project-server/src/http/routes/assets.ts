import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import {
  mimeTypeForSpinePart,
  mimeTypeForSpineSkeleton,
  parseDeletableAssetFolderPath,
  resolveSpinePartRelativePath,
} from "@game-editor/assets";
import { ValidationError } from "@game-editor/core";
import { parseAssetImportMultipart } from "../multipart.js";
import { readStringField, requireStringField } from "../body-fields.js";
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
} from "../responses.js";
import type { RouteHandler } from "../route-context.js";

const ASSET_CONTENT_CACHE_MAX_AGE_SECONDS = 60;

export const handleAssetsListRoute: RouteHandler = async (ctx) => {
  if (ctx.url.pathname !== "/assets") {
    return false;
  }
  if (ctx.method === "GET") {
    const synced = await ctx.deps.assetSyncService.reconcile();
    const folders = await ctx.deps.assetFolderService.listFolders();
    sendJson(ctx.res, 200, {
      ok: true,
      database: synced.database,
      folders,
      revision: synced.revision,
    });
    return true;
  }
  sendMethodNotAllowed(ctx.res);
  return true;
};

export const handleAssetFoldersCreateRoute: RouteHandler = async (ctx) => {
  if (ctx.url.pathname !== "/assets/folders") {
    return false;
  }
  if (ctx.method !== "POST") {
    sendMethodNotAllowed(ctx.res);
    return true;
  }
  const body = await readJsonBody(ctx.req);
  const folderPath = requireStringField(
    body,
    "path",
    "Expected { path: string }",
  );
  const folder = await ctx.deps.assetFolderService.createFolder(folderPath);
  const folders = await ctx.deps.assetFolderService.listFolders();
  sendJson(ctx.res, 200, { ok: true, folder, folders });
  return true;
};

export const handleAssetFoldersRenameRoute: RouteHandler = async (ctx) => {
  if (ctx.url.pathname !== "/assets/folders/rename") {
    return false;
  }
  if (ctx.method !== "POST") {
    sendMethodNotAllowed(ctx.res);
    return true;
  }
  const body = await readJsonBody(ctx.req);
  const folderPath = readStringField(body, "path");
  const name = readStringField(body, "name");
  if (!folderPath || !name) {
    throw new ValidationError("Expected { path: string, name: string }");
  }
  const result = await ctx.deps.assetMutationService.renameFolder(
    folderPath,
    name,
  );
  sendJson(ctx.res, 200, { ok: true, ...result });
  return true;
};

export const handleAssetImportRoute: RouteHandler = async (ctx) => {
  if (ctx.url.pathname !== "/assets/import") {
    return false;
  }
  if (ctx.method !== "POST") {
    sendMethodNotAllowed(ctx.res);
    return true;
  }
  const parsed = await parseAssetImportMultipart(ctx.req);
  if (parsed.files.length === 0) {
    sendJson(ctx.res, 400, {
      ok: false,
      error: "NO_FILES",
      message: "No files were uploaded",
      errors: [],
    });
    return true;
  }
  const result = await ctx.deps.assetImportService.importFiles(
    parsed.files,
    parsed.destination,
  );
  const folders = await ctx.deps.assetFolderService.listFolders();
  sendJson(ctx.res, 200, { ok: true, ...result, folders });
  return true;
};

export const handleAssetContentRoute: RouteHandler = async (ctx) => {
  const match = /^\/assets\/([^/]+)\/content$/.exec(ctx.url.pathname);
  if (!match) {
    return false;
  }
  if (ctx.method !== "GET") {
    sendMethodNotAllowed(ctx.res);
    return true;
  }
  const assetId = decodeURIComponent(match[1] ?? "");
  const database = await ctx.deps.assetDatabaseStore.load();
  const record = database.get(assetId);
  if (!record) {
    sendNotFound(ctx.res);
    return true;
  }
  const absolute = ctx.deps.projectService.resolveProjectPath(record.path);
  const fileStat = await stat(absolute);
  const mime =
    record.metadata.kind === "texture"
      ? record.metadata.mimeType
      : record.metadata.kind === "spine"
        ? mimeTypeForSpineSkeleton(record.metadata.skeletonFormat)
        : "application/octet-stream";
  // Local-dev only: wildcard CORS. Do not ship this for non-local hosts.
  ctx.res.writeHead(200, {
    "content-type": mime,
    "content-length": fileStat.size,
    "cache-control": `private, max-age=${String(ASSET_CONTENT_CACHE_MAX_AGE_SECONDS)}`,
    "access-control-allow-origin": "*",
  });
  createReadStream(absolute).pipe(ctx.res);
  return true;
};

export const handleAssetPartRoute: RouteHandler = async (ctx) => {
  const match = /^\/assets\/([^/]+)\/part\/([^/]+)$/.exec(ctx.url.pathname);
  if (!match) {
    return false;
  }
  if (ctx.method !== "GET") {
    sendMethodNotAllowed(ctx.res);
    return true;
  }
  const assetId = decodeURIComponent(match[1] ?? "");
  const part = decodeURIComponent(match[2] ?? "");
  const database = await ctx.deps.assetDatabaseStore.load();
  const record = database.get(assetId);
  if (!record) {
    sendNotFound(ctx.res);
    return true;
  }
  const relative = resolveSpinePartRelativePath(record, part);
  if (!relative) {
    sendNotFound(ctx.res);
    return true;
  }
  const absolute = ctx.deps.projectService.resolveProjectPath(relative);
  const fileStat = await stat(absolute);
  ctx.res.writeHead(200, {
    "content-type": mimeTypeForSpinePart(relative),
    "content-length": fileStat.size,
    "cache-control": `private, max-age=${String(ASSET_CONTENT_CACHE_MAX_AGE_SECONDS)}`,
    "access-control-allow-origin": "*",
  });
  createReadStream(absolute).pipe(ctx.res);
  return true;
};

export const handleAssetRenameRoute: RouteHandler = async (ctx) => {
  const match = /^\/assets\/([^/]+)\/rename$/.exec(ctx.url.pathname);
  if (!match) {
    return false;
  }
  if (ctx.method !== "POST") {
    sendMethodNotAllowed(ctx.res);
    return true;
  }
  const assetId = decodeURIComponent(match[1] ?? "");
  const body = await readJsonBody(ctx.req);
  const name = requireStringField(body, "name", "Expected { name: string }");
  const result = await ctx.deps.assetMutationService.renameAsset(assetId, name);
  sendJson(ctx.res, 200, { ok: true, ...result });
  return true;
};

export const handleAssetMoveRoute: RouteHandler = async (ctx) => {
  const match = /^\/assets\/([^/]+)\/move$/.exec(ctx.url.pathname);
  if (!match) {
    return false;
  }
  if (ctx.method !== "POST") {
    sendMethodNotAllowed(ctx.res);
    return true;
  }
  const assetId = decodeURIComponent(match[1] ?? "");
  const body = await readJsonBody(ctx.req);
  const destination = requireStringField(
    body,
    "destination",
    "Expected { destination: string }",
  );
  const result = await ctx.deps.assetMutationService.moveAsset(
    assetId,
    destination,
  );
  sendJson(ctx.res, 200, { ok: true, ...result });
  return true;
};

export const handleAssetFoldersDeleteRoute: RouteHandler = async (ctx) => {
  if (ctx.url.pathname !== "/assets/folders/delete") {
    return false;
  }
  if (ctx.method !== "POST") {
    sendMethodNotAllowed(ctx.res);
    return true;
  }
  const body = await readJsonBody(ctx.req);
  const rawPath =
    typeof body === "object" && body !== null && "path" in body
      ? (body as { path: unknown }).path
      : undefined;
  // Reject traversal / root / scenes before any FS work.
  const folderPath = parseDeletableAssetFolderPath(rawPath);
  const result = await ctx.deps.assetMutationService.deleteFolder(folderPath);
  sendJson(ctx.res, 200, { ok: true, ...result });
  return true;
};

export const handleAssetDeleteRoute: RouteHandler = async (ctx) => {
  const match = /^\/assets\/([^/]+)\/delete$/.exec(ctx.url.pathname);
  if (!match) {
    return false;
  }
  if (ctx.method !== "POST") {
    sendMethodNotAllowed(ctx.res);
    return true;
  }
  const assetId = decodeURIComponent(match[1] ?? "");
  const result = await ctx.deps.assetMutationService.deleteAsset(assetId);
  sendJson(ctx.res, 200, { ok: true, ...result });
  return true;
};
