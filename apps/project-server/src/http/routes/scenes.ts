import { ValidationError } from "@game-editor/core";
import { readStringField } from "../body-fields.js";
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
} from "../responses.js";
import type { RouteHandler } from "../route-context.js";

export const handleScenesCollectionRoute: RouteHandler = async (ctx) => {
  if (ctx.url.pathname !== "/scenes") {
    return false;
  }
  if (ctx.method === "GET") {
    const scenes = await ctx.deps.sceneFileService.listScenes();
    sendJson(ctx.res, 200, { ok: true, scenes });
    return true;
  }
  if (ctx.method === "POST") {
    const body = await readJsonBody(ctx.req);
    const id = readStringField(body, "id");
    const name = readStringField(body, "name");
    if (!id) {
      throw new ValidationError("Expected { id: string, name?: string }");
    }
    const scene = await ctx.deps.sceneFileService.createScene(id, name);
    sendJson(ctx.res, 201, { ok: true, scene });
    return true;
  }
  sendMethodNotAllowed(ctx.res);
  return true;
};

export const handleSceneItemRoute: RouteHandler = async (ctx) => {
  const match = /^\/scenes\/([^/]+)$/.exec(ctx.url.pathname);
  if (!match) {
    return false;
  }
  const sceneId = decodeURIComponent(match[1] ?? "");
  if (ctx.method === "GET") {
    const scene = await ctx.deps.sceneFileService.loadScene(sceneId);
    sendJson(ctx.res, 200, { ok: true, scene });
    return true;
  }
  if (ctx.method === "PUT") {
    const body = await readJsonBody(ctx.req);
    const scene = await ctx.deps.sceneFileService.saveScene(sceneId, body);
    sendJson(ctx.res, 200, { ok: true, scene });
    return true;
  }
  if (ctx.method === "PATCH") {
    const body = await readJsonBody(ctx.req);
    const nextId = readStringField(body, "id");
    if (!nextId) {
      throw new ValidationError("Expected { id: string }");
    }
    const entry = await ctx.deps.sceneFileService.renameScene(sceneId, nextId);
    await ctx.deps.projectFileService.onSceneRenamed(sceneId, nextId);
    sendJson(ctx.res, 200, { ok: true, scene: entry });
    return true;
  }
  if (ctx.method === "DELETE") {
    const scenes = await ctx.deps.sceneFileService.listScenes();
    const fallback = scenes.find((entry) => entry.id !== sceneId);
    await ctx.deps.sceneFileService.deleteScene(sceneId);
    if (fallback) {
      await ctx.deps.projectFileService.onSceneDeleted(sceneId, fallback.id);
    }
    sendJson(ctx.res, 200, { ok: true });
    return true;
  }
  sendMethodNotAllowed(ctx.res);
  return true;
};
