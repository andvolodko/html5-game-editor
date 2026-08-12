import { ValidationError } from "@game-editor/core";
import { readStringField } from "../body-fields.js";
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
} from "../responses.js";
import type { RouteHandler } from "../route-context.js";

export const handleProjectsRoute: RouteHandler = async (ctx) => {
  if (ctx.url.pathname !== "/projects") {
    return false;
  }
  if (ctx.method !== "GET") {
    sendMethodNotAllowed(ctx.res);
    return true;
  }
  if (!ctx.deps.projectCatalogService) {
    throw new ValidationError("Project catalog is not configured");
  }
  const projects = await ctx.deps.projectCatalogService.listProjects();
  sendJson(ctx.res, 200, {
    ok: true,
    projects,
    activeProjectId: ctx.deps.projectCatalogService.getActiveProjectId(),
  });
  return true;
};

export const handleProjectOpenRoute: RouteHandler = async (ctx) => {
  if (ctx.url.pathname !== "/project/open") {
    return false;
  }
  if (ctx.method !== "POST") {
    sendMethodNotAllowed(ctx.res);
    return true;
  }
  if (!ctx.deps.projectCatalogService) {
    throw new ValidationError("Project catalog is not configured");
  }
  const body = await readJsonBody(ctx.req);
  const projectId = readStringField(body, "id")?.trim() ?? "";
  if (projectId.length === 0) {
    throw new ValidationError("Expected { id: string }");
  }
  await ctx.deps.projectCatalogService.openProject(projectId);
  const project = await ctx.deps.projectFileService.loadProject();
  sendJson(ctx.res, 200, {
    ok: true,
    projectId,
    project,
  });
  return true;
};

export const handleProjectRoute: RouteHandler = async (ctx) => {
  if (ctx.url.pathname !== "/project") {
    return false;
  }
  if (ctx.method === "GET") {
    const project = await ctx.deps.projectFileService.loadProject();
    sendJson(ctx.res, 200, {
      ok: true,
      project,
      projectId: ctx.deps.projectCatalogService?.getActiveProjectId() ?? null,
    });
    return true;
  }
  if (ctx.method === "PUT") {
    const body = await readJsonBody(ctx.req);
    const project = await ctx.deps.projectFileService.saveProject(body);
    sendJson(ctx.res, 200, { ok: true, project });
    return true;
  }
  sendMethodNotAllowed(ctx.res);
  return true;
};
