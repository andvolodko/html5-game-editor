import type { ServerResponse } from "node:http";
import { DomainError, ValidationError } from "@game-editor/core";
import { sendJson } from "./responses.js";

export function handleRouteError(res: ServerResponse, error: unknown): void {
  if (error instanceof ValidationError) {
    sendJson(res, 400, { ok: false, error: error.code, message: error.message });
    return;
  }
  if (error instanceof DomainError) {
    const status =
      error.code === "SCENE_NOT_FOUND" || error.code === "PROJECT_NOT_FOUND"
        ? 404
        : 400;
    sendJson(res, status, {
      ok: false,
      error: error.code,
      message: error.message,
      ...(error.code === "ASSET_IMPORT_FAILED" ? { errors: [] } : {}),
    });
    return;
  }

  if (error instanceof Error && error.message.includes("exceeds")) {
    sendJson(res, 413, {
      ok: false,
      error: "PAYLOAD_TOO_LARGE",
      message: error.message,
    });
    return;
  }

  sendJson(res, 500, {
    ok: false,
    error: "INTERNAL_ERROR",
    message: error instanceof Error ? error.message : "Unknown error",
  });
}
