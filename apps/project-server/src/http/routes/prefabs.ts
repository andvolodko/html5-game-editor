import { ValidationError } from "@game-editor/core";
import { readStringField } from "../body-fields.js";
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
} from "../responses.js";
import type { RouteHandler } from "../route-context.js";

export const handlePrefabsCollectionRoute: RouteHandler = async (ctx) => {
  if (ctx.url.pathname !== "/prefabs") {
    return false;
  }
  if (ctx.method !== "POST") {
    sendMethodNotAllowed(ctx.res);
    return true;
  }
  const body = await readJsonBody(ctx.req);
  const name = readStringField(body, "name");
  const destination = readStringField(body, "destination");
  const root =
    typeof body === "object" && body !== null && "root" in body
      ? (body as { root: unknown }).root
      : undefined;
  if (!name || root === undefined) {
    throw new ValidationError("Expected { name: string, root: SceneNodeData }");
  }
  const created = await ctx.deps.prefabFileService.createPrefab({
    name,
    root,
    destination,
  });
  sendJson(ctx.res, 201, { ok: true, ...created });
  return true;
};

export const handlePrefabItemRoute: RouteHandler = async (ctx) => {
  const match = /^\/prefabs\/([^/]+)$/.exec(ctx.url.pathname);
  if (!match) {
    return false;
  }
  const assetId = decodeURIComponent(match[1] ?? "");
  if (ctx.method === "GET") {
    const prefab = await ctx.deps.prefabFileService.loadPrefab(assetId);
    sendJson(ctx.res, 200, { ok: true, prefab });
    return true;
  }
  if (ctx.method === "PUT") {
    const body = await readJsonBody(ctx.req);
    const prefab = await ctx.deps.prefabFileService.savePrefab(assetId, body);
    sendJson(ctx.res, 200, { ok: true, prefab });
    return true;
  }
  sendMethodNotAllowed(ctx.res);
  return true;
};
