import { describe, expect, it } from "vitest";
import {
  createContainerNode,
  createEmptyScene,
  createSpriteNode,
  insertNodeInScene,
} from "@game-editor/scene";
import { resolvePrefabDropParent } from "./hierarchy-prefab-drop";

describe("resolvePrefabDropParent", () => {
  it("drops on the scene root when no row is targeted", () => {
    const scene = createEmptyScene();
    expect(resolvePrefabDropParent(scene, undefined)).toBeUndefined();
  });

  it("parents under a container row", () => {
    const scene = createEmptyScene();
    const container = createContainerNode("Folder");
    insertNodeInScene(scene, container, undefined, 0);
    expect(resolvePrefabDropParent(scene, container.id)).toBe(container.id);
  });

  it("parents beside a leaf row", () => {
    const scene = createEmptyScene();
    const container = createContainerNode("Folder");
    insertNodeInScene(scene, container, undefined, 0);
    const sprite = createSpriteNode("Card");
    insertNodeInScene(scene, sprite, container.id, 0);
    expect(resolvePrefabDropParent(scene, sprite.id)).toBe(container.id);
  });
});
