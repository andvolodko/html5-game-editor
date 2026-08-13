import { describe, expect, it } from "vitest";
import {
  createEmptyScene,
  createNodeWithTransform3D,
  findNodeById,
  getModel3D,
  getTransform3D,
} from "@game-editor/scene";
import {
  destroyNodeInScene,
  spawnModel3DInScene,
} from "./script-scene-spawn.js";

describe("spawnModel3DInScene", () => {
  it("inserts a Model3D node at the given transform", () => {
    const scene = createEmptyScene("Spawn", { renderer: "three" });
    const node = spawnModel3DInScene(scene, {
      assetId: "asset_stone",
      name: "Stone",
      position: { x: 1, y: 2, z: 3 },
      rotation: { x: 0.1, y: 0.2, z: 0.3 },
      scale: { x: 2, y: 2, z: 2 },
    });

    expect(node?.name).toBe("Stone");
    expect(scene.nodes).toHaveLength(1);
    expect(scene.nodes[0]?.id).toBe(node?.id);
    expect(getTransform3D(node!)).toMatchObject({
      position: { x: 1, y: 2, z: 3 },
      rotation: { x: 0.1, y: 0.2, z: 0.3 },
      scale: { x: 2, y: 2, z: 2 },
    });
    expect(getModel3D(node!)).toMatchObject({
      assetId: "asset_stone",
      playing: false,
      loop: false,
    });
  });

  it("returns undefined for an empty assetId", () => {
    const scene = createEmptyScene("Empty");
    expect(
      spawnModel3DInScene(scene, {
        assetId: "",
        position: { x: 0, y: 0, z: 0 },
      }),
    ).toBeUndefined();
    expect(scene.nodes).toHaveLength(0);
  });

  it("parents under an existing node", () => {
    const parent = createNodeWithTransform3D("Catapult", { x: 0, y: 0, z: 0 });
    const scene = createEmptyScene("Parented", { renderer: "three" });
    scene.nodes = [parent];
    const stone = spawnModel3DInScene(scene, {
      assetId: "asset_stone",
      parentId: parent.id,
      position: { x: 0, y: 1, z: 0 },
    });
    expect(stone?.parentId).toBe(parent.id);
    expect(parent.children).toHaveLength(1);
    expect(parent.children[0]?.id).toBe(stone?.id);
  });
});

describe("destroyNodeInScene", () => {
  it("detaches a spawned subtree", () => {
    const scene = createEmptyScene("Destroy", { renderer: "three" });
    const node = spawnModel3DInScene(scene, {
      assetId: "asset_stone",
      position: { x: 0, y: 0, z: 0 },
    });
    expect(node).toBeDefined();
    const removed = destroyNodeInScene(scene, node!.id);
    expect(removed.map((entry) => entry.id)).toEqual([node!.id]);
    expect(scene.nodes).toHaveLength(0);
    expect(findNodeById(scene, node!.id)).toBeUndefined();
  });
});
