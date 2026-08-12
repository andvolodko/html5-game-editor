import { Assets } from "pixi.js";
import type { Texture } from "pixi.js";

interface CachedTexture {
  texture: Texture;
  url: string;
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
    this.cache.set(assetId, { texture, url });
    return texture;
  }

  has(assetId: string): boolean {
    return this.cache.has(assetId);
  }

  /**
   * Drop our cache entry and unload from Pixi Assets so a later load of the
   * same (or new) URL does not revive a destroyed Texture.
   */
  evict(assetId: string): boolean {
    const cached = this.cache.get(assetId);
    if (!cached) {
      return false;
    }
    this.cache.delete(assetId);
    if (Assets.cache.has(cached.url)) {
      void Assets.unload(cached.url);
      return true;
    }
    cached.texture.destroy(true);
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
