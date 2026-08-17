import { ValidationError } from "@game-editor/core";
import { readStringField } from "../body-fields.js";
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
} from "../responses.js";
import type { RouteHandler } from "../route-context.js";

function readOptionalNumberField(body: unknown, key: string): number | undefined {
  if (typeof body !== "object" || body === null || !(key in body)) {
    return undefined;
  }
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export const handleTileSetsCollectionRoute: RouteHandler = async (ctx) => {
  if (ctx.url.pathname !== "/tilesets") {
    return false;
  }
  if (ctx.method !== "POST") {
    sendMethodNotAllowed(ctx.res);
    return true;
  }
  const body = await readJsonBody(ctx.req);
  const name = readStringField(body, "name");
  const imageAssetId = readStringField(body, "imageAssetId");
  const destination = readStringField(body, "destination");
  if (!name || !imageAssetId) {
    throw new ValidationError("Expected { name: string, imageAssetId: string }");
  }
  const created = await ctx.deps.tileSetFileService.createTileSet({
    name,
    imageAssetId,
    tileWidth: readOptionalNumberField(body, "tileWidth"),
    tileHeight: readOptionalNumberField(body, "tileHeight"),
    margin: readOptionalNumberField(body, "margin"),
    spacing: readOptionalNumberField(body, "spacing"),
    destination,
  });
  sendJson(ctx.res, 201, { ok: true, ...created });
  return true;
};

export const handleTileSetItemRoute: RouteHandler = async (ctx) => {
  const match = /^\/tilesets\/([^/]+)$/.exec(ctx.url.pathname);
  if (!match) {
    return false;
  }
  const assetId = decodeURIComponent(match[1] ?? "");
  if (ctx.method === "GET") {
    const tileset = await ctx.deps.tileSetFileService.loadTileSet(assetId);
    sendJson(ctx.res, 200, { ok: true, tileset });
    return true;
  }
  if (ctx.method === "PUT") {
    const body = await readJsonBody(ctx.req);
    const tileset = await ctx.deps.tileSetFileService.saveTileSet(assetId, body);
    sendJson(ctx.res, 200, { ok: true, tileset });
    return true;
  }
  sendMethodNotAllowed(ctx.res);
  return true;
};
