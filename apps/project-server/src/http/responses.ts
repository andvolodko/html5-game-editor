import type { IncomingMessage, ServerResponse } from "node:http";

/** Local-dev CORS. Do not use wildcard origins for non-local deployments. */
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,PUT,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
} as const;

export const MAX_JSON_BODY_BYTES = 2 * 1024 * 1024;

export function sendJson(
  res: ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    ...CORS_HEADERS,
  });
  res.end(payload);
}

export function sendNotFound(res: ServerResponse): void {
  sendJson(res, 404, { ok: false, error: "NOT_FOUND" });
}

export function sendMethodNotAllowed(res: ServerResponse): void {
  sendJson(res, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });
}

export function sendNoContent(res: ServerResponse): void {
  res.writeHead(204, { ...CORS_HEADERS });
  res.end();
}

export async function readJsonBody(
  req: IncomingMessage,
  maxBytes = MAX_JSON_BODY_BYTES,
): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > maxBytes) {
      throw new Error(`Request body exceeds ${String(maxBytes)} bytes`);
    }
    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (raw.trim().length === 0) {
    throw new Error("Request body is empty");
  }
  return JSON.parse(raw) as unknown;
}
