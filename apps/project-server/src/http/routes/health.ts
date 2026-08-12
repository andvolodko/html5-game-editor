import { sendJson, sendMethodNotAllowed } from "../responses.js";
import type { RouteHandler } from "../route-context.js";

export const handleHealthRoute: RouteHandler = async (ctx) => {
  if (ctx.url.pathname !== "/health") {
    return false;
  }
  if (ctx.method !== "GET") {
    sendMethodNotAllowed(ctx.res);
    return true;
  }
  sendJson(ctx.res, 200, {
    ok: true,
    service: "project-server",
    projectRoot: ctx.deps.projectService.getProjectRoot(),
    projectId: ctx.deps.projectCatalogService?.getActiveProjectId() ?? null,
  });
  return true;
};
