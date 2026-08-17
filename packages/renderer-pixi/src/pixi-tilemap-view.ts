import { Container } from "pixi.js";
import type { Texture } from "pixi.js";
import { CompositeTilemap } from "@pixi/tilemap";
import type { TileSetResolved } from "@game-editor/assets";
import {
  animatedLogicalTileIds,
  parseTileAnimationClockKey,
  sharedTileAnimationClock,
  tileRegion,
  tileSetConfigKey,
  type TileAnimationClock,
} from "@game-editor/assets";
import {
  chunkKey,
  collectAnimatedTileUsage,
  chunksForChangedLogicalTiles,
  EMPTY_TILE,
  TILEMAP_CHUNK_SIZE,
  type TilemapComponentData,
  type TilemapLayerData,
} from "@game-editor/scene";
import type { TileTextureCache } from "./tile-texture-cache.js";

interface TilemapSyncArgs {
  data: TilemapComponentData;
  source: Texture | undefined;
  tileset: TileSetResolved | undefined;
  textures: TileTextureCache;
  tilesetId: string | undefined;
}

/**
 * DisplayObject for a Tilemap: one CompositeTilemap per dirty chunk.
 * Animation uses logical cell IDs + a shared clock; not per-cell sprites.
 */
export class PixiTilemapView extends Container {
  readonly chunks = new Map<string, CompositeTilemap>();
  private readonly signatures = new Map<string, string>();
  private usage = new Map<number, Set<string>>();
  private syncArgs: TilemapSyncArgs | undefined;

  constructor() {
    super();
    this.label = "tilemap";
    this.sortableChildren = true;
  }

  sync(
    data: TilemapComponentData,
    source: Texture | undefined,
    tileset: TileSetResolved | undefined,
    textures: TileTextureCache,
    tilesetId: string | undefined,
    clock: TileAnimationClock = sharedTileAnimationClock(),
  ): void {
    this.syncArgs = { data, source, tileset, textures, tilesetId };
    if (tilesetId && tileset) {
      clock.setTileset(tilesetId, tileset);
    }
    const animated = new Set(tileset ? animatedLogicalTileIds(tileset) : []);
    this.usage = collectAnimatedTileUsage(data, animated);
    const keep = new Set<string>();
    let z = 0;
    for (const layer of data.layers) {
      for (const chunk of layer.chunks) {
        const key = `${layer.id}:${chunkKey(chunk.x, chunk.y)}`;
        keep.add(key);
        const signature = chunkSignature(
          data,
          layer,
          chunk,
          tileset,
          source?.source.uid,
        );
        if (this.signatures.get(key) === signature) {
          const existing = this.chunks.get(key);
          if (existing) {
            existing.visible = layer.visible;
            existing.alpha = layer.opacity;
            existing.zIndex = z;
          }
          z += 1;
          continue;
        }
        this.rebuildChunk(key, layer, chunk, z, clock);
        z += 1;
      }
    }
    for (const [key, view] of [...this.chunks.entries()]) {
      if (keep.has(key)) {
        continue;
      }
      view.removeFromParent();
      view.destroy({ children: true });
      this.chunks.delete(key);
      this.signatures.delete(key);
    }
  }

  /**
   * Rebuild only chunks that contain logical tiles whose visible frame changed.
   */
  applyAnimationFrames(
    changedKeys: ReadonlySet<string>,
    clock: TileAnimationClock = sharedTileAnimationClock(),
  ): void {
    const args = this.syncArgs;
    if (!args?.tilesetId || !args.tileset || changedKeys.size === 0) {
      return;
    }
    const logicalIds = new Set<number>();
    for (const key of changedKeys) {
      const parsed = parseTileAnimationClockKey(key);
      if (!parsed || parsed.tilesetId !== args.tilesetId) {
        continue;
      }
      logicalIds.add(parsed.logicalTileId);
    }
    if (logicalIds.size === 0) {
      return;
    }
    const dirty = chunksForChangedLogicalTiles(this.usage, logicalIds);
    if (dirty.size === 0) {
      return;
    }
    let z = 0;
    for (const layer of args.data.layers) {
      for (const chunk of layer.chunks) {
        const key = `${layer.id}:${chunkKey(chunk.x, chunk.y)}`;
        if (dirty.has(key)) {
          this.rebuildChunk(key, layer, chunk, z, clock);
        }
        z += 1;
      }
    }
  }

  private rebuildChunk(
    key: string,
    layer: TilemapLayerData,
    chunk: TilemapLayerData["chunks"][number],
    z: number,
    clock: TileAnimationClock,
  ): void {
    const args = this.syncArgs;
    if (!args) {
      return;
    }
    let view = this.chunks.get(key);
    if (!view) {
      view = new CompositeTilemap();
      view.eventMode = "none";
      this.addChild(view);
      this.chunks.set(key, view);
    }
    view.clear();
    view.position.set(
      chunk.x * TILEMAP_CHUNK_SIZE * args.data.tileWidth,
      chunk.y * TILEMAP_CHUNK_SIZE * args.data.tileHeight,
    );
    view.visible = layer.visible;
    view.alpha = layer.opacity;
    view.zIndex = z;
    if (args.source && args.tileset && layer.visible && layer.opacity > 0) {
      paintChunk(
        view,
        args.data,
        chunk,
        args.source,
        args.tileset,
        args.textures,
        args.tilesetId,
        clock,
      );
    }
    this.signatures.set(
      key,
      chunkSignature(
        args.data,
        layer,
        chunk,
        args.tileset,
        args.source?.source.uid,
      ),
    );
  }
}

function paintChunk(
  view: CompositeTilemap,
  data: TilemapComponentData,
  chunk: TilemapLayerData["chunks"][number],
  source: Texture,
  tileset: TileSetResolved,
  textures: TileTextureCache,
  tilesetId: string | undefined,
  clock: TileAnimationClock,
): void {
  for (let i = 0; i < chunk.tiles.length; i += 1) {
    const logicalId = chunk.tiles[i]!;
    if (logicalId === EMPTY_TILE) {
      continue;
    }
    const frameId =
      tilesetId !== undefined
        ? clock.currentFrame(tilesetId, tileset, logicalId)
        : logicalId;
    const localX = i % chunk.width;
    const localY = Math.floor(i / chunk.width);
    const region = tileRegion({
      tileId: frameId,
      columns: tileset.columns,
      rows: tileset.rows,
      tileWidth: tileset.tileWidth,
      tileHeight: tileset.tileHeight,
      margin: tileset.margin,
      spacing: tileset.spacing,
    });
    if (!region) {
      continue;
    }
    if (tilesetId) {
      textures.get(tilesetId, frameId, tileset, source);
    }
    view.tile(source, localX * data.tileWidth, localY * data.tileHeight, {
      u: region.x,
      v: region.y,
      tileWidth: region.width,
      tileHeight: region.height,
    });
  }
}

function chunkSignature(
  data: TilemapComponentData,
  layer: TilemapLayerData,
  chunk: TilemapLayerData["chunks"][number],
  tileset: TileSetResolved | undefined,
  sourceUid: number | undefined,
): string {
  return [
    tileset ? tileSetConfigKey(tileset) : "",
    String(sourceUid ?? 0),
    String(data.tileWidth),
    String(data.tileHeight),
    String(layer.visible),
    String(layer.opacity),
    chunk.tiles.join(","),
  ].join("|");
}
