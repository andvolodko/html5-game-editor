import { describe, expect, it } from "vitest";
import {
  computeTileSetGrid,
  isValidTileId,
  parseTileSetData,
  serializeTileSetData,
  tileCount,
  tileIdToColumnRow,
  tileRegion,
  tileIdAtPixel,
} from "./index.js";

describe("TileSet grid math", () => {
  it("computes columns and rows from image size without margin or spacing", () => {
    expect(
      computeTileSetGrid({
        imageWidth: 128,
        imageHeight: 64,
        tileWidth: 32,
        tileHeight: 32,
        margin: 0,
        spacing: 0,
      }),
    ).toEqual({ columns: 4, rows: 2 });
  });

  it("accounts for margin on all sides", () => {
    expect(
      computeTileSetGrid({
        imageWidth: 70,
        imageHeight: 38,
        tileWidth: 32,
        tileHeight: 32,
        margin: 3,
        spacing: 0,
      }),
    ).toEqual({ columns: 2, rows: 1 });
  });

  it("accounts for spacing between tiles", () => {
    expect(
      computeTileSetGrid({
        imageWidth: 67,
        imageHeight: 32,
        tileWidth: 32,
        tileHeight: 32,
        margin: 0,
        spacing: 3,
      }),
    ).toEqual({ columns: 2, rows: 1 });
  });

  it("combines margin and spacing", () => {
    expect(
      computeTileSetGrid({
        imageWidth: 73,
        imageHeight: 38,
        tileWidth: 32,
        tileHeight: 32,
        margin: 3,
        spacing: 3,
      }),
    ).toEqual({ columns: 2, rows: 1 });
  });

  it("returns zero when the image cannot hold a tile", () => {
    expect(
      computeTileSetGrid({
        imageWidth: 16,
        imageHeight: 16,
        tileWidth: 32,
        tileHeight: 32,
        margin: 0,
        spacing: 0,
      }),
    ).toEqual({ columns: 0, rows: 0 });
  });
});

describe("tile regions", () => {
  const grid = {
    columns: 4,
    rows: 2,
    tileWidth: 32,
    tileHeight: 16,
    margin: 2,
    spacing: 1,
  };

  it("maps tile ID 0 to the first region including margin", () => {
    expect(tileRegion({ tileId: 0, ...grid })).toEqual({
      x: 2,
      y: 2,
      width: 32,
      height: 16,
    });
  });

  it("applies spacing when advancing columns", () => {
    expect(tileRegion({ tileId: 1, ...grid })).toEqual({
      x: 2 + 32 + 1,
      y: 2,
      width: 32,
      height: 16,
    });
  });

  it("wraps to the next row", () => {
    expect(tileRegion({ tileId: 4, ...grid })).toEqual({
      x: 2,
      y: 2 + 16 + 1,
      width: 32,
      height: 16,
    });
    expect(tileIdToColumnRow(4, 4)).toEqual({ column: 0, row: 1 });
  });

  it("maps pixel hits to tile ids and ignores spacing", () => {
    expect(
      tileIdAtPixel({
        x: 2,
        y: 2,
        columns: 4,
        rows: 2,
        tileWidth: 32,
        tileHeight: 16,
        margin: 2,
        spacing: 1,
      }),
    ).toBe(0);
    expect(
      tileIdAtPixel({
        x: 2 + 32 + 1 + 1,
        y: 2,
        columns: 4,
        rows: 2,
        tileWidth: 32,
        tileHeight: 16,
        margin: 2,
        spacing: 1,
      }),
    ).toBe(1);
    expect(
      tileIdAtPixel({
        x: 2 + 32,
        y: 2,
        columns: 4,
        rows: 2,
        tileWidth: 32,
        tileHeight: 16,
        margin: 2,
        spacing: 1,
      }),
    ).toBeUndefined();
  });

  it("rejects out-of-range tile ids", () => {
    expect(tileRegion({ tileId: 8, ...grid })).toBeUndefined();
    expect(tileRegion({ tileId: -1, ...grid })).toBeUndefined();
    expect(isValidTileId(7, 4, 2)).toBe(true);
    expect(isValidTileId(8, 4, 2)).toBe(false);
    expect(tileCount(4, 2)).toBe(8);
  });
});

describe("TileSet serialization", () => {
  it("round-trips a TileSet document", () => {
    const data = {
      version: 1,
      id: "tileset_grass",
      name: "Grass",
      imageAssetId: "asset_grass",
      tileWidth: 32,
      tileHeight: 32,
      margin: 1,
      spacing: 2,
      columns: 8,
      rows: 4,
      tiles: { "0": { name: "dirt" } },
    };
    const parsed = parseTileSetData(
      JSON.parse(serializeTileSetData(data)) as unknown,
    );
    expect(parsed).toEqual(data);
  });

  it("round-trips tile animation metadata without runtime clock state", () => {
    const data = {
      version: 1,
      id: "tileset_water",
      name: "Water",
      imageAssetId: "asset_water",
      tileWidth: 32,
      tileHeight: 32,
      margin: 0,
      spacing: 0,
      columns: 8,
      rows: 4,
      tiles: {
        "20": {
          name: "Water",
          animation: {
            loop: true,
            frames: [
              { tileId: 20, duration: 120 },
              { tileId: 21, duration: 120 },
              { tileId: 22, duration: 120 },
              { tileId: 23, duration: 120 },
            ],
          },
        },
      },
    };
    const json = serializeTileSetData(data);
    expect(json).not.toContain("elapsed");
    expect(json).not.toContain("frameIndex");
    expect(parseTileSetData(JSON.parse(json) as unknown)).toEqual(data);
  });
});
