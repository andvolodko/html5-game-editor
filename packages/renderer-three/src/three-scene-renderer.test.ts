import { describe, expect, it } from "vitest";
import {
  createEmptyScene,
  createSpriteNode,
  findNodeById,
} from "@game-editor/scene";
import { ThreeSceneRenderer } from "./three-scene-renderer.js";

describe("ThreeSceneRenderer", () => {
  it("reparents without mutating domain SceneNodeData", () => {
    const scene = createEmptyScene("T");
    const parent = createSpriteNode("P", { x: 0, y: 0 });
    const child = createSpriteNode("C", { x: 1, y: 0 });
    child.parentId = parent.id;
    parent.children = [child];
    scene.nodes = [parent];

    const renderer = new ThreeSceneRenderer();
    renderer.createNode(parent);
    renderer.createNode(child);

    const parentIdBefore = child.parentId;
    renderer.reparentNode(child.id, undefined, 0);

    expect(child.parentId).toBe(parentIdBefore);
    expect(renderer.getRuntimeParentId(child.id)).toBeUndefined();
    expect(findNodeById(scene, child.id)?.parentId).toBe(parentIdBefore);
  });
});
