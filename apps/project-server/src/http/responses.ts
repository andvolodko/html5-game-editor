import type { ServerResponse } from "node:http";

export function sendJson(
  res: ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

export function sendNotFound(res: ServerResponse): void {
  sendJson(res, 404, { ok: false, error: "NOT_FOUND" });
}

export function sendMethodNotAllowed(res: ServerResponse): void {
  sendJson(res, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });
}
