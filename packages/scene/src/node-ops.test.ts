import { describe, expect, it } from "vitest";
import {
  allocateDuplicateName,
  allocateNumberedName,
  cloneNodeSubtree,
  createEmptyScene,
  createSpriteNode,
  getSprite,
  insertNodeInScene,
  normalizeRootMostNodeIds,
  selectionAfterDelete,
} from "./index.js";

describe("node-ops", () => {
  it("clones subtree with new ids and same assetId", () => {
    const root = createSpriteNode("Root", { x: 0, y: 0 }, { assetId: "asset_a" });
    const child = createSpriteNode("Child", { x: 1, y: 1 }, { assetId: "asset_b" });
    child.parentId = root.id;
    root.children = [child];
    const clone = cloneNodeSubtree(root);
    expect(clone.id).not.toBe(root.id);
    expect(clone.children[0]?.id).not.toBe(child.id);
    expect(getSprite(clone)?.assetId).toBe("asset_a");
    expect(getSprite(clone.children[0]!)?.assetId).toBe("asset_b");
  });

  it("normalizes root-most selection", () => {
    const scene = createEmptyScene("S");
    const parent = createSpriteNode("P");
    const child = createSpriteNode("C");
    child.parentId = parent.id;
    parent.children = [child];
    scene.nodes = [parent];
    expect(normalizeRootMostNodeIds(scene, [parent.id, child.id])).toEqual([
      parent.id,
    ]);
  });

  it("selectionAfterDelete prefers next sibling", () => {
    const scene = createEmptyScene("S");
    const a = createSpriteNode("A");
    const b = createSpriteNode("B");
    const c = createSpriteNode("C");
    scene.nodes = [a, c];
    expect(
      selectionAfterDelete(scene, b.id, [b.id], undefined, 1, [a.id, b.id, c.id]),
    ).toEqual([c.id]);
  });

  it("allocates copy names", () => {
    expect(allocateDuplicateName("Button", [])).toBe("Button Copy");
    expect(allocateDuplicateName("Button", ["Button Copy"])).toBe("Button Copy 2");
    expect(allocateNumberedName("Container", ["Container"])).toBe("Container 2");
  });

  it("inserts nodes under parent", () => {
    const scene = createEmptyScene("S");
    const parent = createSpriteNode("P");
    scene.nodes = [parent];
    const child = createSpriteNode("C");
    insertNodeInScene(scene, child, parent.id, 0);
    expect(parent.children[0]?.id).toBe(child.id);
    expect(child.parentId).toBe(parent.id);
  });
});
