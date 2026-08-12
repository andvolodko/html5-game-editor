import type { IncomingMessage, ServerResponse } from "node:http";
import type { ProjectService } from "../services/project-service.js";
import { sendJson, sendNotFound, sendMethodNotAllowed } from "./responses.js";

export interface RouterDeps {
  projectService: ProjectService;
}

export function createRouter(deps: RouterDeps) {
  return {
    async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
      const method = req.method ?? "GET";
      const url = new URL(req.url ?? "/", "http://localhost");

      if (url.pathname === "/health") {
        if (method !== "GET") {
          sendMethodNotAllowed(res);
          return;
        }
        sendJson(res, 200, {
          ok: true,
          service: "project-server",
          projectRoot: deps.projectService.getProjectRoot(),
        });
        return;
      }

      sendNotFound(res);
    },
  };
}
