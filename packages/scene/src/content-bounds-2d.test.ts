import { describe, expect, it } from "vitest";
import { collectSceneContentBounds2D } from "./content-bounds-2d.js";
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
