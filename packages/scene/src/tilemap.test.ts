import { describe, expect, it } from "vitest";
import { createTilemapComponent } from "./factories/tilemap.js";
import {
  applyTileChanges,
  eraseTile,
  getTile,
  occupiedTileBounds,
  setTile,
} from "./tilemap.js";
import {
  chunkCoord,
  EMPTY_TILE,
  TILEMAP_CHUNK_SIZE,
} from "./tilemap-data.js";

describe("Tilemap cells", () => {
  it("sets, gets, and erases tiles", () => {
    const tilemap = createTilemapComponent();
    const layerId = tilemap.layers[0]!.id;
    expect(getTile(tilemap, layerId, 3, 4)).toBe(EMPTY_TILE);
    expect(setTile(tilemap, layerId, 3, 4, 7)).toBe(true);
    expect(getTile(tilemap, layerId, 3, 4)).toBe(7);
    expect(setTile(tilemap, layerId, 3, 4, 7)).toBe(false);
    expect(eraseTile(tilemap, layerId, 3, 4)).toBe(true);
    expect(getTile(tilemap, layerId, 3, 4)).toBe(EMPTY_TILE);
    expect(eraseTile(tilemap, layerId, 3, 4)).toBe(false);
  });

  it("supports negative coordinates", () => {
    const tilemap = createTilemapComponent();
    const layerId = tilemap.layers[0]!.id;
    expect(setTile(tilemap, layerId, -1, -2, 4)).toBe(true);
    expect(getTile(tilemap, layerId, -1, -2)).toBe(4);
    expect(chunkCoord(-1)).toBe(-1);
    expect(tilemap.layers[0]?.chunks[0]?.x).toBe(-1);
    expect(tilemap.layers[0]?.chunks[0]?.y).toBe(-1);
  });

  it("allocates a new chunk at the boundary and keeps the previous chunk", () => {
    const tilemap = createTilemapComponent();
    const layerId = tilemap.layers[0]!.id;
    expect(setTile(tilemap, layerId, TILEMAP_CHUNK_SIZE - 1, 0, 1)).toBe(true);
    expect(setTile(tilemap, layerId, TILEMAP_CHUNK_SIZE, 0, 2)).toBe(true);
    expect(tilemap.layers[0]?.chunks).toHaveLength(2);
    expect(getTile(tilemap, layerId, TILEMAP_CHUNK_SIZE - 1, 0)).toBe(1);
    expect(getTile(tilemap, layerId, TILEMAP_CHUNK_SIZE, 0)).toBe(2);
  });

  it("creates sparse chunks only where tiles exist", () => {
    const tilemap = createTilemapComponent();
    const layerId = tilemap.layers[0]!.id;
    expect(tilemap.layers[0]?.chunks).toEqual([]);
    setTile(tilemap, layerId, 100, 50, 9);
    expect(tilemap.layers[0]?.chunks).toHaveLength(1);
    expect(tilemap.layers[0]?.chunks[0]).toMatchObject({
      x: chunkCoord(100),
      y: chunkCoord(50),
    });
  });

  it("removes empty chunks after erase", () => {
    const tilemap = createTilemapComponent();
    const layerId = tilemap.layers[0]!.id;
    setTile(tilemap, layerId, 0, 0, 1);
    setTile(tilemap, layerId, 1, 0, 2);
    eraseTile(tilemap, layerId, 0, 0);
    expect(tilemap.layers[0]?.chunks).toHaveLength(1);
    eraseTile(tilemap, layerId, 1, 0);
    expect(tilemap.layers[0]?.chunks).toEqual([]);
  });

  it("applies a batch of tile changes for undo/redo", () => {
    const tilemap = createTilemapComponent();
    const layerId = tilemap.layers[0]!.id;
    setTile(tilemap, layerId, 0, 0, 1);
    const changes = [
      { layerId, x: 0, y: 0, before: 1, after: 5 },
      { layerId, x: 2, y: 3, before: EMPTY_TILE, after: 8 },
    ];
    applyTileChanges(tilemap, changes, "after");
    expect(getTile(tilemap, layerId, 0, 0)).toBe(5);
    expect(getTile(tilemap, layerId, 2, 3)).toBe(8);
    applyTileChanges(tilemap, changes, "before");
    expect(getTile(tilemap, layerId, 0, 0)).toBe(1);
    expect(getTile(tilemap, layerId, 2, 3)).toBe(EMPTY_TILE);
  });

  it("computes occupied bounds including negatives", () => {
    const tilemap = createTilemapComponent();
    const layerId = tilemap.layers[0]!.id;
    setTile(tilemap, layerId, -2, 4, 1);
    setTile(tilemap, layerId, 3, -1, 2);
    expect(occupiedTileBounds(tilemap)).toEqual({
      minX: -2,
      minY: -1,
      maxX: 3,
      maxY: 4,
    });
  });
});
