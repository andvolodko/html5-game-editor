import { describe, expect, it } from "vitest";
import {
  animatedLogicalTileIds,
  parseTileAnimationClockKey,
  resolveAnimatedTileFrame,
  TileAnimationClock,
  tileAnimationClockKey,
  tileHasPlayableAnimation,
} from "./tile-animation.js";
import type { TileAnimationSource } from "./tile-animation.js";
import { parseTileSetData, serializeTileSetData } from "./schema.js";

function waterTileset(
  extra?: Partial<TileAnimationSource>,
): TileAnimationSource {
  return {
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
    ...extra,
  };
}

describe("resolveAnimatedTileFrame", () => {
  it("resolves a static tile to itself", () => {
    const tileset = waterTileset();
    expect(resolveAnimatedTileFrame(tileset, 4, 0)).toBe(4);
    expect(resolveAnimatedTileFrame(tileset, 4, 10_000)).toBe(4);
  });

  it("uses the first frame at t=0 and stays until duration elapses", () => {
    const tileset = waterTileset();
    expect(resolveAnimatedTileFrame(tileset, 20, 0)).toBe(20);
    expect(resolveAnimatedTileFrame(tileset, 20, 119)).toBe(20);
    expect(resolveAnimatedTileFrame(tileset, 20, 120)).toBe(21);
    expect(resolveAnimatedTileFrame(tileset, 20, 240)).toBe(22);
    expect(resolveAnimatedTileFrame(tileset, 20, 360)).toBe(23);
    expect(resolveAnimatedTileFrame(tileset, 20, 480)).toBe(20);
  });

  it("honours uneven frame durations", () => {
    const tileset = waterTileset({
      tiles: {
        "20": {
          animation: {
            frames: [
              { tileId: 20, duration: 100 },
              { tileId: 21, duration: 200 },
              { tileId: 22, duration: 75 },
            ],
          },
        },
      },
    });
    expect(resolveAnimatedTileFrame(tileset, 20, 99)).toBe(20);
    expect(resolveAnimatedTileFrame(tileset, 20, 100)).toBe(21);
    expect(resolveAnimatedTileFrame(tileset, 20, 299)).toBe(21);
    expect(resolveAnimatedTileFrame(tileset, 20, 300)).toBe(22);
    expect(resolveAnimatedTileFrame(tileset, 20, 375)).toBe(20);
  });

  it("holds the last frame when loop is false", () => {
    const tileset = waterTileset({
      tiles: {
        "20": {
          animation: {
            loop: false,
            frames: [
              { tileId: 20, duration: 120 },
              { tileId: 21, duration: 120 },
              { tileId: 22, duration: 120 },
              { tileId: 23, duration: 120 },
            ],
          },
        },
      },
    });
    expect(resolveAnimatedTileFrame(tileset, 20, 360)).toBe(23);
    expect(resolveAnimatedTileFrame(tileset, 20, 10_000)).toBe(23);
  });

  it("advances across multiple frames for a large delta via elapsed time", () => {
    const tileset = waterTileset();
    expect(resolveAnimatedTileFrame(tileset, 20, 800)).toBe(22);
  });

  it("skips invalid durations and missing tile ids", () => {
    const tileset = waterTileset({
      tiles: {
        "20": {
          animation: {
            frames: [
              { tileId: 20, duration: 0 },
              { tileId: 21, duration: 120 },
              { tileId: 999, duration: 120 },
              { tileId: 22, duration: -5 },
              { tileId: 23, duration: 120 },
            ],
          },
        },
      },
    });
    expect(resolveAnimatedTileFrame(tileset, 20, 0)).toBe(21);
    expect(resolveAnimatedTileFrame(tileset, 20, 120)).toBe(23);
    expect(resolveAnimatedTileFrame(tileset, 20, 240)).toBe(21);
  });

  it("treats an empty frames array as static", () => {
    const tileset = waterTileset({
      tiles: {
        "20": { animation: { frames: [] } },
      },
    });
    expect(resolveAnimatedTileFrame(tileset, 20, 500)).toBe(20);
    expect(tileHasPlayableAnimation(tileset, 20)).toBe(false);
  });

  it("does not recursively resolve animation on frame tiles", () => {
    const tileset = waterTileset({
      tiles: {
        "20": {
          animation: {
            frames: [
              { tileId: 20, duration: 120 },
              { tileId: 21, duration: 120 },
            ],
          },
        },
        "21": {
          animation: {
            frames: [
              { tileId: 22, duration: 50 },
              { tileId: 23, duration: 50 },
            ],
          },
        },
      },
    });
    expect(resolveAnimatedTileFrame(tileset, 20, 120)).toBe(21);
    expect(resolveAnimatedTileFrame(tileset, 21, 50)).toBe(23);
  });
});

describe("TileAnimationClock", () => {
  it("keeps one timeline per logical tile and reports frame changes", () => {
    const clock = new TileAnimationClock();
    const tileset = waterTileset();
    clock.setTileset("asset_water", tileset);
    expect(clock.advance(119, 0).size).toBe(0);
    expect(clock.currentFrame("asset_water", tileset, 20)).toBe(20);
    const changed = clock.advance(1, 20);
    expect([...changed]).toEqual(["asset_water:20"]);
    expect(clock.currentFrame("asset_water", tileset, 20)).toBe(21);
  });

  it("coalesces two advances in the same display frame", () => {
    const clock = new TileAnimationClock();
    const tileset = waterTileset();
    clock.setTileset("asset_water", tileset);
    clock.advance(0, 0);
    const changed = clock.advance(120, 16);
    expect([...changed]).toEqual(["asset_water:20"]);
    expect(clock.currentFrame("asset_water", tileset, 20)).toBe(21);
    const coalesced = clock.advance(120, 18);
    expect(clock.currentFrame("asset_water", tileset, 20)).toBe(21);
    expect([...coalesced]).toEqual(["asset_water:20"]);
  });

  it("reports a frame change when the first tick skips multiple frames", () => {
    const clock = new TileAnimationClock();
    const tileset = waterTileset();
    clock.setTileset("asset_water", tileset);
    const changed = clock.advance(800, 0);
    expect([...changed]).toEqual(["asset_water:20"]);
    expect(clock.currentFrame("asset_water", tileset, 20)).toBe(22);
  });

  it("does not serialize runtime elapsed on the TileSet document", () => {
    const clock = new TileAnimationClock();
    const tileset = waterTileset();
    clock.setTileset("asset_water", tileset);
    clock.advance(240, 0);
    const document = parseTileSetData({
      version: 1,
      id: "tileset_water",
      name: "Water",
      imageAssetId: "asset_png",
      tileWidth: 32,
      tileHeight: 32,
      margin: 0,
      spacing: 0,
      columns: 8,
      rows: 4,
      tiles: tileset.tiles,
    });
    const json = serializeTileSetData(document);
    expect(json).toContain('"tileId": 20');
    expect(json).not.toContain("elapsed");
    expect(json).not.toContain("frameIndex");
    expect(parseTileAnimationClockKey(tileAnimationClockKey("asset_water", 20))).toEqual(
      { tilesetId: "asset_water", logicalTileId: 20 },
    );
    expect(animatedLogicalTileIds(tileset)).toEqual([20]);
  });
});
