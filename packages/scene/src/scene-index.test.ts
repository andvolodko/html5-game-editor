import { describe, expect, it } from "vitest";
import { createEmptyScene, createSpriteNode } from "./factories/scene.js";
import { cloneNodeSubtree, insertNodeInScene } from "./node-ops.js";
import { SceneIndex } from "./scene-index.js";
import type { SceneNodeData } from "./types.js";

function tree(): {
  scene: ReturnType<typeof createEmptyScene>;
  root: SceneNodeData;
  child: SceneNodeData;
  grandchild: SceneNodeData;
  sibling: SceneNodeData;
} {
  const scene = createEmptyScene("Indexed");
  const root = createSpriteNode("Root", { x: 0, y: 0 });
  const child = createSpriteNode("Child", { x: 1, y: 0 });
  const grandchild = createSpriteNode("Grandchild", { x: 2, y: 0 });
  const sibling = createSpriteNode("Sibling", { x: 3, y: 0 });
  grandchild.parentId = child.id;
  child.children = [grandchild];
  child.parentId = root.id;
  root.children = [child];
  scene.nodes = [root, sibling];
  return { scene, root, child, grandchild, sibling };
}

describe("SceneIndex", () => {
  it("rebuilds and finds nodes and parents", () => {
    const { scene, root, child, grandchild, sibling } = tree();
    const index = new SceneIndex();
    index.rebuild(scene);

    expect(index.hasNode(root.id)).toBe(true);
    expect(index.getNode(child.id)).toBe(child);
    expect(index.getParentId(root.id)).toBeUndefined();
    expect(index.getParentId(child.id)).toBe(root.id);
    expect(index.getParent(grandchild.id)).toBe(child);
    expect(index.getParent(sibling.id)).toBeUndefined();
    expect(index.getNode("missing")).toBeUndefined();
  });

  it("indexes a deep hierarchy without losing leaves", () => {
    const scene = createEmptyScene("Deep");
    let current = createSpriteNode("N0");
    scene.nodes = [current];
    const ids = [current.id];
    for (let depth = 1; depth < 32; depth += 1) {
      const next = createSpriteNode(`N${String(depth)}`);
      next.parentId = current.id;
      current.children = [next];
      current = next;
      ids.push(current.id);
    }
    const index = new SceneIndex();
    index.rebuild(scene);
    const leafId = ids[ids.length - 1];
    expect(leafId).toBeDefined();
    expect(index.hasNode(leafId!)).toBe(true);
    expect(index.getParentId(ids[1]!)).toBe(ids[0]);
  });

  it("addNode indexes a subtree inserted after rebuild", () => {
    const { scene, root } = tree();
    const index = new SceneIndex();
    index.rebuild(scene);

    const extra = createSpriteNode("Extra");
    const extraChild = createSpriteNode("ExtraChild");
    extraChild.parentId = extra.id;
    extra.children = [extraChild];
    insertNodeInScene(scene, extra, root.id, 1);
    index.addNode(extra);

    expect(index.getNode(extra.id)).toBe(extra);
    expect(index.getParentId(extra.id)).toBe(root.id);
    expect(index.getParent(extraChild.id)).toBe(extra);
  });

  it("removeNode drops the node and descendants", () => {
    const { scene, child, grandchild } = tree();
    const index = new SceneIndex();
    index.rebuild(scene);
    index.removeNode(child.id);

    expect(index.hasNode(child.id)).toBe(false);
    expect(index.hasNode(grandchild.id)).toBe(false);
    expect(index.getParent(grandchild.id)).toBeUndefined();
  });

  it("reparentNode updates parent lookup", () => {
    const { scene, child, sibling } = tree();
    const index = new SceneIndex();
    index.rebuild(scene);
    child.parentId = sibling.id;
    index.reparentNode(child.id, sibling.id);

    expect(index.getParentId(child.id)).toBe(sibling.id);
    expect(index.getParent(child.id)).toBe(sibling);
  });

  it("duplicate indexes the clone as a new subtree", () => {
    const { scene, child } = tree();
    const index = new SceneIndex();
    index.rebuild(scene);
    const clone = cloneNodeSubtree(child);
    insertNodeInScene(scene, clone, undefined, scene.nodes.length);
    index.addNode(clone);

    expect(index.getNode(clone.id)).toBe(clone);
    expect(clone.id).not.toBe(child.id);
    expect(index.getNode(child.id)).toBe(child);
    expect(index.hasNode(clone.children[0]!.id)).toBe(true);
    expect(index.getParentId(clone.children[0]!.id)).toBe(clone.id);
  });

  it("rebuild replaces previous contents", () => {
    const first = tree();
    const index = new SceneIndex();
    index.rebuild(first.scene);
    const second = createEmptyScene("Other");
    const only = createSpriteNode("Only");
    second.nodes = [only];
    index.rebuild(second);

    expect(index.hasNode(first.root.id)).toBe(false);
    expect(index.getNode(only.id)).toBe(only);
  });

  it("clear empties the index", () => {
    const { scene, root } = tree();
    const index = new SceneIndex();
    index.rebuild(scene);
    index.clear();
    expect(index.hasNode(root.id)).toBe(false);
    expect(index.getNode(root.id)).toBeUndefined();
  });
});
