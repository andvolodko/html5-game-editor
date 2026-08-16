import { describe, expect, it } from "vitest";
import { createEmptyScene, createSpriteNode } from "@game-editor/scene";
import { flattenVisibleNodeIds } from "./hierarchy-visible.js";

describe("flattenVisibleNodeIds", () => {
  it("omits children of collapsed parents", () => {
    const scene = createEmptyScene("H");
    const parent = createSpriteNode("Parent");
    const child = createSpriteNode("Child");
    child.parentId = parent.id;
    parent.children = [child];
    const sibling = createSpriteNode("Sibling");
    scene.nodes = [parent, sibling];

    expect(flattenVisibleNodeIds(scene.nodes, new Set())).toEqual([
      parent.id,
      sibling.id,
    ]);
    expect(flattenVisibleNodeIds(scene.nodes, new Set([parent.id]))).toEqual([
      parent.id,
      child.id,
      sibling.id,
    ]);
  });
});
