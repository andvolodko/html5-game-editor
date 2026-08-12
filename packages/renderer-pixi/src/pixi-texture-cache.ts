import { Assets } from "pixi.js";
import type { Texture } from "pixi.js";

interface CachedTexture {
  texture: Texture;
  url: string;
}

/**
 * Scene + Preview each own a PixiTextureCache, but Pixi `Assets` is process-wide.
 * Refcount URLs so one renderer’s destroy/evict does not unload textures another
 * still paints (Stop preview must not blank the Scene panel).
 */
const urlRetainCounts = new Map<string, number>();

function retainUrl(url: string): void {
  urlRetainCounts.set(url, (urlRetainCounts.get(url) ?? 0) + 1);
}

/**
 * Drop one retain. When the last retainer releases, unload from Assets (or
 * destroy the texture if it was never registered there).
 */
function releaseUrl(url: string, texture: Texture): void {
  const current = urlRetainCounts.get(url) ?? 0;
  if (current <= 1) {
    urlRetainCounts.delete(url);
    if (Assets.cache.has(url)) {
      void Assets.unload(url);
      return;
    }
    texture.destroy(true);
    return;
  }
  urlRetainCounts.set(url, current - 1);
}

/** Test-only: reset cross-cache retain counts between cases. */
export function resetPixiTextureUrlRetainsForTests(): void {
  urlRetainCounts.clear();
}

/**
 * Pixi Assets-backed texture cache keyed by assetId.
 * Tracks URL so revision/content changes invalidate.
 */
export class PixiTextureCache {
  private readonly cache = new Map<string, CachedTexture>();

  async load(assetId: string, url: string, format: string): Promise<Texture> {
    const cached = this.cache.get(assetId);
    if (cached && cached.url === url) {
      return cached.texture;
    }
    if (cached) {
      this.evict(assetId);
    }
    // Content URLs are extensionless (`/assets/:id/content`); Pixi cannot infer
    // a loader from the path, so force the texture parser + format hint.
    const texture = (await Assets.load({
      src: url,
      parser: "texture",
      format,
    })) as Texture;
    retainUrl(url);
    this.cache.set(assetId, { texture, url });
    return texture;
  }

  has(assetId: string): boolean {
    return this.cache.has(assetId);
  }

  /**
   * Drop our cache entry. Unloads from Pixi Assets only when no other
   * PixiTextureCache instance still retains the same URL.
   */
  evict(assetId: string): boolean {
    const cached = this.cache.get(assetId);
    if (!cached) {
      return false;
    }
    this.cache.delete(assetId);
    releaseUrl(cached.url, cached.texture);
    return true;
  }

  evictStale(resolveUrl: (assetId: string) => string | undefined): void {
    for (const [assetId, cached] of [...this.cache.entries()]) {
      const currentUrl = resolveUrl(assetId);
      if (!currentUrl || currentUrl !== cached.url) {
        this.evict(assetId);
      }
    }
  }

  evictAll(): void {
    for (const assetId of [...this.cache.keys()]) {
      this.evict(assetId);
    }
  }
}
