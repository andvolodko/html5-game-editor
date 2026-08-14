import { describe, expect, it } from "vitest";
import {
  createEmptyScene,
  createSpriteNode,
  findNodeById,
} from "@game-editor/scene";
import { NodeClipboard, resolvePasteLocation } from "./node-clipboard.js";

describe("NodeClipboard", () => {
  it("stores root-most snapshots and ignores nested selection", () => {
    const scene = createEmptyScene("C");
    const parent = createSpriteNode("Parent", { x: 0, y: 0 });
    const child = createSpriteNode("Child", { x: 1, y: 0 });
    child.parentId = parent.id;
    parent.children = [child];
    scene.nodes = [parent];

    const clipboard = new NodeClipboard();
    expect(clipboard.copyFromScene(scene, [parent.id, child.id])).toBe(true);
    expect(clipboard.templates()).toHaveLength(1);
    expect(clipboard.templates()[0]?.name).toBe("Parent");
    expect(clipboard.templates()[0]?.id).toBe(parent.id);
  });

  it("keeps snapshots after the source node is removed", () => {
    const scene = createEmptyScene("C");
    const node = createSpriteNode("Hero", { x: 0, y: 0 });
    scene.nodes = [node];
    const clipboard = new NodeClipboard();
    clipboard.copyFromScene(scene, [node.id]);
    scene.nodes = [];
    expect(findNodeById(scene, node.id)).toBeUndefined();
    expect(clipboard.templates()[0]?.name).toBe("Hero");
  });

  it("returns false when nothing copyable is selected", () => {
    const clipboard = new NodeClipboard();
    expect(clipboard.copyFromScene(createEmptyScene("C"), [])).toBe(false);
    expect(clipboard.hasContent()).toBe(false);
  });
});

describe("resolvePasteLocation", () => {
  it("inserts after the primary sibling", () => {
    const scene = createEmptyScene("C");
    const a = createSpriteNode("A", { x: 0, y: 0 });
    const b = createSpriteNode("B", { x: 1, y: 0 });
    scene.nodes = [a, b];
    expect(resolvePasteLocation(scene, a.id)).toEqual({
      parentId: undefined,
      index: 1,
    });
  });

  it("falls back to the scene root when nothing is selected", () => {
    const scene = createEmptyScene("C");
    scene.nodes = [createSpriteNode("A", { x: 0, y: 0 })];
    expect(resolvePasteLocation(scene, undefined)).toEqual({
      parentId: undefined,
      index: 1,
    });
  });
});
