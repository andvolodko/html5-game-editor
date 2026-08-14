import { Assets } from "pixi.js";
import type { Spritesheet, Texture } from "pixi.js";

const parsedSheets = new Map<string, Spritesheet>();
const inflight = new Map<string, Promise<Spritesheet>>();

export function pixiSpritesheetCachePrefix(jsonUrl: string): string {
  return `${jsonUrl}#`;
}

function isPixiSpritesheet(value: unknown): value is Spritesheet {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.textures !== null &&
    typeof record.textures === "object" &&
    record.animations !== null &&
    typeof record.animations === "object"
  );
}

/**
 * Load a Pixi spritesheet once per JSON URL.
 * Frame names are also prefixed in Pixi's global Cache so preview + scene
 * (and React Strict Mode remounts) do not collide on `frame-0`.
 */
export async function loadPixiSpritesheet(jsonUrl: string): Promise<Spritesheet> {
  const cached = parsedSheets.get(jsonUrl);
  if (cached) {
    return cached;
  }
  const pending = inflight.get(jsonUrl);
  if (pending) {
    return pending;
  }
  const load = (async () => {
    const loaded: unknown = await Assets.load({
      src: jsonUrl,
      data: { cachePrefix: pixiSpritesheetCachePrefix(jsonUrl) },
    });
    if (isPixiSpritesheet(loaded)) {
      parsedSheets.set(jsonUrl, loaded);
      return loaded;
    }
    throw new Error(`Expected a Pixi spritesheet at ${jsonUrl}`);
  })();
  inflight.set(jsonUrl, load);
  try {
    return await load;
  } finally {
    inflight.delete(jsonUrl);
  }
}

export function spritesheetTextures(
  sheet: Spritesheet,
  animation: string | undefined,
): Texture[] {
  if (animation && sheet.animations[animation]?.length) {
    return sheet.animations[animation] ?? [];
  }
  const fallback = sheet.animations.default;
  if (fallback && fallback.length > 0) {
    return fallback;
  }
  return Object.values(sheet.textures);
}

export function evictPixiSpritesheet(jsonUrl: string): void {
  parsedSheets.delete(jsonUrl);
  if (Assets.cache.has(jsonUrl)) {
    void Assets.unload(jsonUrl);
  }
}

/** Test-only: drop in-memory sheet handles between cases. */
export function resetPixiSpritesheetCacheForTests(): void {
  parsedSheets.clear();
  inflight.clear();
}
