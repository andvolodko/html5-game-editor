import type { IncomingMessage, ServerResponse } from "node:http";
import type { RouterDeps } from "./router-deps.js";
import type { RouteHandler } from "./route-context.js";
import { handleRouteError } from "./route-error.js";
import { sendNotFound } from "./responses.js";
import { handleHealthRoute } from "./routes/health.js";
import {
  handleProjectOpenRoute,
  handleProjectRoute,
  handleProjectsRoute,
} from "./routes/project.js";
import {
  handleAssetContentRoute,
  handleAssetDeleteRoute,
  handleAssetFoldersCreateRoute,
  handleAssetFoldersDeleteRoute,
  handleAssetFoldersRenameRoute,
  handleAssetImportRoute,
  handleAssetMoveRoute,
  handleAssetPartRoute,
  handleAssetRenameRoute,
  handleAssetsListRoute,
} from "./routes/assets.js";
import {
  handleSceneItemRoute,
  handleScenesCollectionRoute,
} from "./routes/scenes.js";

export type { RouterDeps } from "./router-deps.js";

/** Order matters for overlapping path prefixes (e.g. /assets vs /assets/…). */
const ROUTE_HANDLERS: readonly RouteHandler[] = [
  handleHealthRoute,
  handleProjectsRoute,
  handleProjectOpenRoute,
  handleProjectRoute,
  handleAssetsListRoute,
  handleAssetFoldersCreateRoute,
  handleAssetFoldersRenameRoute,
  handleAssetImportRoute,
  handleAssetContentRoute,
  handleAssetPartRoute,
  handleAssetRenameRoute,
  handleAssetMoveRoute,
  handleAssetFoldersDeleteRoute,
  handleAssetDeleteRoute,
  handleScenesCollectionRoute,
  handleSceneItemRoute,
];

export function createRouter(deps: RouterDeps) {
  return {
    async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
      const method = req.method ?? "GET";
      const url = new URL(req.url ?? "/", "http://localhost");
      const ctx = { req, res, method, url, deps };

      try {
        for (const handler of ROUTE_HANDLERS) {
          if (await handler(ctx)) {
            return;
          }
        }
        sendNotFound(res);
      } catch (error) {
        handleRouteError(res, error);
      }
    },
  };
}
