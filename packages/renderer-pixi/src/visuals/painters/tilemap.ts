import type { TilemapComponentData } from "@game-editor/scene";
import {
  DEFAULT_TILEMAP_EMPTY_EXTENT_TILES,
  tilemapLocalBounds,
} from "@game-editor/scene";
import type { PixiVisualPainter, VisualPaintResult } from "../types.js";
import {
  destroyVisual,
  ensureChild,
  missingTextureResult,
  resolveTexture,
  unassignedTextureResult,
} from "../paint-helpers.js";
import { PixiTilemapView } from "../../pixi-tilemap-view.js";
import { TileTextureCache } from "../../tile-texture-cache.js";

const tileTextures = new TileTextureCache();

export function evictTileTextureCache(assetId?: string): void {
  if (assetId) {
    tileTextures.evictAsset(assetId);
    return;
  }
  tileTextures.evictAll();
}

export const tilemapPainter: PixiVisualPainter = {
  type: "Tilemap",
  async paint(ctx): Promise<VisualPaintResult> {
    const data = ctx.data as TilemapComponentData;
    const bounds = tilemapLocalBounds(data, DEFAULT_TILEMAP_EMPTY_EXTENT_TILES);
    const tileset = data.tileSetId
      ? ctx.assetResolver?.resolveTileSet?.(data.tileSetId)
      : undefined;

    if (!data.tileSetId) {
      return unassignedTextureResult(
        ctx,
        data.type,
        bounds.width,
        bounds.height,
        undefined,
        false,
      );
    }
    if (!tileset) {
      ctx.warnMissingAsset(data.tileSetId);
      return missingTextureResult(ctx, data.type, bounds.width, bounds.height, false);
    }

    const { texture, missing } = await resolveTexture(ctx, tileset.imageAssetId);
    if (!texture || missing) {
      ctx.warnMissingAsset(tileset.imageAssetId);
      return missingTextureResult(ctx, data.type, bounds.width, bounds.height, false);
    }

    ctx.hidePlaceholder();
    let view =
      ctx.visualType === "Tilemap" && ctx.visual instanceof PixiTilemapView
        ? ctx.visual
        : undefined;
    if (!view) {
      destroyVisual(ctx.visual);
      view = new PixiTilemapView();
      ensureChild(ctx.visualsRoot, view);
    } else {
      ensureChild(ctx.visualsRoot, view);
    }
    view.sync(data, texture, tileset, tileTextures, data.tileSetId);
    view.visible = true;
    return {
      visual: view,
      visualType: data.type,
      bounds,
    };
  },
};
