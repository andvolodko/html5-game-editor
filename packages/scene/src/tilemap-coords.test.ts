import { describe, expect, it } from "vitest";
import { createEmptyScene, createNodeWithVisual } from "./factories.js";
import { createTilemapComponent } from "./factories/tilemap.js";
import { createTransform2D } from "./factories/scene.js";
import { localToTile, tileToWorld, worldToTile } from "./tilemap-coords.js";

describe("tilemap coordinates", () => {
  it("converts local pixels to tile indices", () => {
    const tilemap = createTilemapComponent({ tileWidth: 16, tileHeight: 32 });
    expect(localToTile(tilemap, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(localToTile(tilemap, { x: 15, y: 31 })).toEqual({ x: 0, y: 0 });
    expect(localToTile(tilemap, { x: 16, y: 32 })).toEqual({ x: 1, y: 1 });
    expect(localToTile(tilemap, { x: -1, y: -1 })).toEqual({ x: -1, y: -1 });
  });

  it("accounts for nested Tilemap transforms", () => {
    const scene = createEmptyScene("t");
    const parent = createNodeWithVisual("Parent", { x: 100, y: 50 });
    const tilemap = createTilemapComponent({ tileWidth: 10, tileHeight: 10 });
    const child = createNodeWithVisual("Map", { x: 20, y: 10 }, tilemap);
    child.parentId = parent.id;
    parent.children = [child];
    scene.nodes = [parent];

    const world = tileToWorld(scene, child.id, tilemap, { x: 2, y: 3 });
    expect(world).toEqual({ x: 100 + 20 + 20, y: 50 + 10 + 30 });
    expect(worldToTile(scene, child.id, tilemap, world)).toEqual({ x: 2, y: 3 });
  });

  it("accounts for rotation on the Tilemap node", () => {
    const scene = createEmptyScene("t");
    const tilemap = createTilemapComponent({ tileWidth: 10, tileHeight: 10 });
    const node = createNodeWithVisual("Map", { x: 0, y: 0 }, tilemap);
    const transform = node.components[0];
    if (transform && transform.type === "Transform2D") {
      Object.assign(transform, createTransform2D({
        position: { x: 0, y: 0 },
        rotation: 90,
        scale: { x: 1, y: 1 },
      }));
    }
    scene.nodes = [node];
    const world = tileToWorld(scene, node.id, tilemap, { x: 2, y: 0 });
    expect(world.x).toBeCloseTo(0, 6);
    expect(world.y).toBeCloseTo(20, 6);
    expect(worldToTile(scene, node.id, tilemap, world)).toEqual({ x: 2, y: 0 });
  });
});
