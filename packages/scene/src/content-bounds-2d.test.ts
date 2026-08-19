import { describe, expect, it } from "vitest";
import { collectSceneContentBounds2D, nodesIntersectingWorldAabb } from "./content-bounds-2d.js";
import { createEmptyScene, createSpriteNode } from "./factories/scene.js";
import { createContainerNode } from "./node-ops.js";

describe("collectSceneContentBounds2D", () => {
  it("unions sprite display size around the default center anchor", () => {
    const scene = createEmptyScene("Prefab");
    const root = createContainerNode("Button");
    const sprite = createSpriteNode("Icon", { x: 0, y: 0 }, {
      assetId: "asset_tex",
      width: 64,
      height: 64,
    });
    sprite.parentId = root.id;
    root.children = [sprite];
    scene.nodes = [root];

    const bounds = collectSceneContentBounds2D(scene);
    expect(bounds).toEqual({ x: -32, y: -32, width: 64, height: 64 });
  });
});

describe("nodesIntersectingWorldAabb", () => {
  it("returns sprites whose world box overlaps the marquee", () => {
    const scene = createEmptyScene("Stage");
    const left = createSpriteNode("Left", { x: 0, y: 0 }, {
      assetId: "asset_a",
      width: 20,
      height: 20,
    });
    const right = createSpriteNode("Right", { x: 80, y: 0 }, {
      assetId: "asset_b",
      width: 20,
      height: 20,
    });
    scene.nodes = [left, right];

    expect(
      nodesIntersectingWorldAabb(scene, { x: -15, y: -15, width: 30, height: 30 }),
    ).toEqual([left.id]);
    expect(
      nodesIntersectingWorldAabb(scene, { x: -20, y: -20, width: 200, height: 40 }),
    ).toEqual([left.id, right.id]);
    expect(
      nodesIntersectingWorldAabb(scene, { x: 200, y: 200, width: 10, height: 10 }),
    ).toEqual([]);
  });
});
