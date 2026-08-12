import { sendJson, sendMethodNotAllowed } from "../responses.js";
import type { RouteHandler } from "../route-context.js";

export const handleComponentsCatalogRoute: RouteHandler = async (ctx) => {
  if (ctx.url.pathname !== "/components/catalog") {
    return false;
  }
  if (ctx.method !== "GET") {
    sendMethodNotAllowed(ctx.res);
    return true;
  }
  if (!ctx.deps.componentCatalogService) {
    sendJson(ctx.res, 200, {
      ok: true,
      catalog: { components: [], busEvents: [] },
    });
    return true;
  }
  const catalog = await ctx.deps.componentCatalogService.getCatalog();
  sendJson(ctx.res, 200, { ok: true, catalog });
  return true;
};
