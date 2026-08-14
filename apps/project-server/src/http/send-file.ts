import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
} as const;

/** Parse a single `bytes=` Range header. Invalid / multipart ranges are ignored. */
export function parseBytesRange(
  header: string | undefined,
  size: number,
): { start: number; end: number } | undefined {
  if (!header || size <= 0) {
    return undefined;
  }
  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!match) {
    return undefined;
  }
  const startRaw = match[1] ?? "";
  const endRaw = match[2] ?? "";
  if (startRaw.length === 0 && endRaw.length === 0) {
    return undefined;
  }
  if (startRaw.length === 0) {
    const suffix = Number(endRaw);
    if (!Number.isInteger(suffix) || suffix <= 0) {
      return undefined;
    }
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(startRaw);
  const end = endRaw.length === 0 ? size - 1 : Number(endRaw);
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < start ||
    start >= size
  ) {
    return undefined;
  }
  return { start, end: Math.min(end, size - 1) };
}

/**
 * Stream a project file. Supports HEAD and `Range` so Chromium `<audio>`/`<video>`
 * can read metadata and seek. Local-dev wildcard CORS — not for public hosts.
 */
export async function sendLocalFile(
  req: IncomingMessage,
  res: ServerResponse,
  absolutePath: string,
  mimeType: string,
  maxAgeSeconds: number,
): Promise<void> {
  const fileStat = await stat(absolutePath);
  const size = fileStat.size;
  const cacheControl = `private, max-age=${String(maxAgeSeconds)}`;
  const range = parseBytesRange(req.headers.range, size);
  const isHead = req.method === "HEAD";

  if (range) {
    const length = range.end - range.start + 1;
    res.writeHead(206, {
      "content-type": mimeType,
      "content-length": length,
      "content-range": `bytes ${String(range.start)}-${String(range.end)}/${String(size)}`,
      "accept-ranges": "bytes",
      "cache-control": cacheControl,
      ...CORS_HEADERS,
    });
    if (isHead || size === 0) {
      res.end();
      return;
    }
    pipeFile(res, absolutePath, range.start, range.end);
    return;
  }

  res.writeHead(200, {
    "content-type": mimeType,
    "content-length": size,
    "accept-ranges": "bytes",
    "cache-control": cacheControl,
    ...CORS_HEADERS,
  });
  if (isHead || size === 0) {
    res.end();
    return;
  }
  pipeFile(res, absolutePath, 0, size - 1);
}

function pipeFile(
  res: ServerResponse,
  absolutePath: string,
  start: number,
  end: number,
): void {
  const stream = createReadStream(absolutePath, { start, end });
  stream.on("error", () => {
    if (!res.writableEnded) {
      res.end();
    }
  });
  stream.pipe(res);
}
