import { describe, expect, it } from "vitest";
import { createTilemapComponent } from "./factories/tilemap.js";
import { eraseTile, setTile } from "./tilemap.js";
import {
  chunksForChangedLogicalTiles,
  collectAnimatedTileUsage,
  tilemapChunkRenderKey,
} from "./tilemap-animation-usage.js";

describe("animated tile chunk usage", () => {
  it("registers usage when placing an animated tile and clears it when removed", () => {
    const tilemap = createTilemapComponent();
    const layerId = tilemap.layers[0]!.id;
    const animated = new Set([20]);
    expect(collectAnimatedTileUsage(tilemap, animated).size).toBe(0);

    setTile(tilemap, layerId, 3, 4, 20);
    const afterPlace = collectAnimatedTileUsage(tilemap, animated);
    const chunkKey = tilemapChunkRenderKey(layerId, 0, 0);
    expect([...afterPlace.get(20)!]).toEqual([chunkKey]);

    setTile(tilemap, layerId, 40, 4, 20);
    const afterSecond = collectAnimatedTileUsage(tilemap, animated);
    expect(afterSecond.get(20)?.size).toBe(2);
    expect(afterSecond.get(20)?.has(tilemapChunkRenderKey(layerId, 1, 0))).toBe(
      true,
    );

    setTile(tilemap, layerId, 3, 4, 7);
    const afterChange = collectAnimatedTileUsage(tilemap, animated);
    expect(afterChange.get(20)?.has(chunkKey)).toBe(false);
    expect(afterChange.get(20)?.has(tilemapChunkRenderKey(layerId, 1, 0))).toBe(
      true,
    );

    eraseTile(tilemap, layerId, 40, 4);
    expect(collectAnimatedTileUsage(tilemap, animated).size).toBe(0);
  });

  it("dirties only chunks that use the changed logical tile", () => {
    const tilemap = createTilemapComponent();
    const layerId = tilemap.layers[0]!.id;
    setTile(tilemap, layerId, 1, 1, 20);
    setTile(tilemap, layerId, 40, 1, 21);
    const usage = collectAnimatedTileUsage(tilemap, new Set([20, 21]));
    const dirty = chunksForChangedLogicalTiles(usage, new Set([20]));
    expect([...dirty]).toEqual([tilemapChunkRenderKey(layerId, 0, 0)]);
    expect(dirty.has(tilemapChunkRenderKey(layerId, 1, 0))).toBe(false);
  });
});
