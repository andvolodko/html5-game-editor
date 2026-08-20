import { ValidationError } from "@game-editor/core";
import { readStringField } from "../body-fields.js";
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
} from "../responses.js";
import type { RouteHandler } from "../route-context.js";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,PUT,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
} as const;

/**
 * POST /build — NDJSON stream of progress events, then a final result line.
 * Body: { platform: "web"|"android", mode?, format?, buildType? }
 */
export const handleBuildRoute: RouteHandler = async (ctx) => {
  if (ctx.url.pathname !== "/build") {
    return false;
  }
  if (ctx.method !== "POST") {
    sendMethodNotAllowed(ctx.res);
    return true;
  }
  if (!ctx.deps.projectBuildService) {
    throw new ValidationError("Build service is not configured");
  }

  const body = await readJsonBody(ctx.req);
  const request = ctx.deps.projectBuildService.parseRequest(body);

  ctx.res.writeHead(200, {
    "content-type": "application/x-ndjson; charset=utf-8",
    "cache-control": "no-cache",
    connection: "keep-alive",
    ...CORS_HEADERS,
  });

  const writeLine = (payload: unknown): void => {
    ctx.res.write(`${JSON.stringify(payload)}\n`);
  };

  try {
    const result = await ctx.deps.projectBuildService.run(request, (event) => {
      writeLine({ type: "progress", ...event });
    });
    writeLine({ type: "result", ...result });
  } catch (error) {
    writeLine({
      type: "result",
      ok: false,
      artifacts: [],
      issues: [
        {
          severity: "error",
          code: "BUILD_FAILED",
          message:
            error instanceof Error ? error.message : "Build failed unexpectedly",
        },
      ],
    });
  }
  ctx.res.end();
  return true;
};

/**
 * POST /build/reveal — open artifact folder in the OS file manager.
 * Body: { path: project-relative path }
 */
export const handleBuildRevealRoute: RouteHandler = async (ctx) => {
  if (ctx.url.pathname !== "/build/reveal") {
    return false;
  }
  if (ctx.method !== "POST") {
    sendMethodNotAllowed(ctx.res);
    return true;
  }
  if (!ctx.deps.projectBuildService) {
    throw new ValidationError("Build service is not configured");
  }
  const body = await readJsonBody(ctx.req);
  const relativePath = readStringField(body, "path");
  if (!relativePath) {
    throw new ValidationError("Expected { path: string }");
  }
  await ctx.deps.projectBuildService.revealPath(relativePath);
  sendJson(ctx.res, 200, { ok: true });
  return true;
};

/**
 * GET /project/android-secrets — status only (never returns passwords).
 * PUT /project/android-secrets — write local gitignored secrets.
 */
export const handleAndroidSecretsRoute: RouteHandler = async (ctx) => {
  if (ctx.url.pathname !== "/project/android-secrets") {
    return false;
  }
  if (!ctx.deps.projectBuildService) {
    throw new ValidationError("Build service is not configured");
  }
  if (ctx.method === "GET") {
    const status = await ctx.deps.projectBuildService.getAndroidSecretsStatus();
    sendJson(ctx.res, 200, { ok: true, configured: status.configured });
    return true;
  }
  if (ctx.method === "PUT") {
    const body = await readJsonBody(ctx.req);
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new ValidationError(
        "Expected { keystorePassword: string, keyPassword: string }",
      );
    }
    const record = body as Record<string, unknown>;
    const keystorePassword =
      typeof record.keystorePassword === "string"
        ? record.keystorePassword
        : "";
    const keyPassword =
      typeof record.keyPassword === "string" ? record.keyPassword : "";
    await ctx.deps.projectBuildService.saveAndroidSecrets({
      keystorePassword,
      keyPassword,
    });
    sendJson(ctx.res, 200, { ok: true, configured: true });
    return true;
  }
  sendMethodNotAllowed(ctx.res);
  return true;
};

/**
 * POST /project/android-keystore — generate a gitignored local upload keystore.
 * Never returns passwords.
 */
export const handleAndroidKeystoreRoute: RouteHandler = async (ctx) => {
  if (ctx.url.pathname !== "/project/android-keystore") {
    return false;
  }
  if (!ctx.deps.projectBuildService) {
    throw new ValidationError("Build service is not configured");
  }
  if (ctx.method !== "POST") {
    sendMethodNotAllowed(ctx.res);
    return true;
  }
  const result = await ctx.deps.projectBuildService.generateLocalKeystore();
  sendJson(ctx.res, 200, {
    ok: true,
    keystorePath: result.keystorePath,
    keyAlias: result.keyAlias,
    created: result.created,
    configured: true,
  });
  return true;
};
