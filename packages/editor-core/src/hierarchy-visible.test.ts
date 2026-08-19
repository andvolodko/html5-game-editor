import { describe, expect, it } from "vitest";
import { createEmptyScene, createSpriteNode } from "@game-editor/scene";
import {
  flattenVisibleNodeIds,
  hierarchyQueryMatchesName,
  hierarchySearchExpandIds,
  hierarchySearchVisibleIds,
  isHierarchySearching,
} from "./hierarchy-visible.js";

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

  it("omits nodes outside includeIds", () => {
    const scene = createEmptyScene("H");
    const parent = createSpriteNode("Parent");
    const child = createSpriteNode("Child");
    child.parentId = parent.id;
    parent.children = [child];
    const sibling = createSpriteNode("Sibling");
    scene.nodes = [parent, sibling];

    expect(
      flattenVisibleNodeIds(
        scene.nodes,
        new Set([parent.id]),
        new Set([parent.id, child.id]),
      ),
    ).toEqual([parent.id, child.id]);
  });
});

describe("hierarchy search", () => {
  it("treats blank queries as not searching", () => {
    expect(isHierarchySearching("")).toBe(false);
    expect(isHierarchySearching("  ")).toBe(false);
    expect(isHierarchySearching("tree")).toBe(true);
    expect(hierarchyQueryMatchesName("Tree", "  ")).toBe(true);
    expect(hierarchyQueryMatchesName("Tree", "tr")).toBe(true);
    expect(hierarchyQueryMatchesName("Rock", "tr")).toBe(false);
  });

  it("keeps ancestors of name matches", () => {
    const scene = createEmptyScene("Forest");
    const environment = createSpriteNode("Environment");
    const tree = createSpriteNode("Tree");
    tree.parentId = environment.id;
    const rock = createSpriteNode("Rock");
    rock.parentId = environment.id;
    environment.children = [tree, rock];
    scene.nodes = [environment];

    const visible = hierarchySearchVisibleIds(scene.nodes, "tree");
    expect([...visible].sort()).toEqual([environment.id, tree.id].sort());
    expect(hierarchySearchExpandIds(scene.nodes, visible)).toEqual(
      new Set([environment.id]),
    );
  });
});
