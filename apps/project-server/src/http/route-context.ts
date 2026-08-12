import type { IncomingMessage, ServerResponse } from "node:http";
import type { RouterDeps } from "./router-deps.js";

export interface RouteContext {
  req: IncomingMessage;
  res: ServerResponse;
  method: string;
  url: URL;
  deps: RouterDeps;
}

/** Return true when the request was handled (including method-not-allowed). */
export type RouteHandler = (ctx: RouteContext) => Promise<boolean>;
