import { Rectangle, Texture } from "pixi.js";
import {
  tileRegion,
  tileSetConfigKey,
  type TileSetResolved,
} from "@game-editor/assets";

interface CachedEntry {
  texture: Texture;
  configKey: string;
}

/**
 * Resolves tilesetId + tileId to a Pixi Texture region.
 * Invalidates when the TileSet config or source texture identity changes.
 */
export class TileTextureCache {
  private readonly cache = new Map<string, CachedEntry>();

  get(
    tilesetId: string,
    tileId: number,
    tileset: TileSetResolved,
    source: Texture,
  ): Texture | undefined {
    const configKey = `${tileSetConfigKey(tileset)}:${String(source.source.uid)}`;
    const key = `${tilesetId}:${String(tileId)}`;
    const cached = this.cache.get(key);
    if (cached && cached.configKey === configKey) {
      return cached.texture;
    }
    if (cached) {
      cached.texture.destroy(false);
      this.cache.delete(key);
    }
    const region = tileRegion({
      tileId,
      columns: tileset.columns,
      rows: tileset.rows,
      tileWidth: tileset.tileWidth,
      tileHeight: tileset.tileHeight,
      margin: tileset.margin,
      spacing: tileset.spacing,
    });
    if (!region) {
      return undefined;
    }
    const texture = new Texture({
      source: source.source,
      frame: new Rectangle(region.x, region.y, region.width, region.height),
    });
    this.cache.set(key, { texture, configKey });
    return texture;
  }

  evictTileset(tilesetId: string): void {
    this.evictAsset(tilesetId);
  }

  /** Evict by TileSet catalogue id or source texture asset id. */
  evictAsset(assetId: string): void {
    const keyPrefix = `${assetId}:`;
    const configPrefix = `${assetId}:`;
    for (const [key, entry] of [...this.cache.entries()]) {
      if (key.startsWith(keyPrefix) || entry.configKey.startsWith(configPrefix)) {
        entry.texture.destroy(false);
        this.cache.delete(key);
      }
    }
  }

  evictAll(): void {
    for (const entry of this.cache.values()) {
      entry.texture.destroy(false);
    }
    this.cache.clear();
  }
}
