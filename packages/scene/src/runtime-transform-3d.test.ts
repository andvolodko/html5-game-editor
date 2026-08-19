import { describe, expect, it } from "vitest";
import { createEmptyScene, createNodeWithTransform3D } from "./factories/scene.js";
import { getTransform3D } from "./queries.js";
import { SceneIndex } from "./scene-index.js";
import {
  bindRuntimeTransform3D,
  createDetachedRuntimeTransform3D,
  resolveSceneRuntimeTransform3D,
} from "./runtime-transform-3d.js";

describe("RuntimeTransform3D", () => {
  it("keeps a stable detached object identity and writes axes in place", () => {
    const transform = createDetachedRuntimeTransform3D({
      position: { x: 1, y: 2, z: 3 },
    });
    expect(transform).toBe(transform);
    expect(transform.position.x).toBe(1);
    transform.position.z = 10;
    expect(transform.position.z).toBe(10);
    transform.setScale({ x: 2, y: 2, z: 2 });
    expect(transform.scale.x).toBe(2);
  });

  it("writes through to the scene Transform3D component", () => {
    const node = createNodeWithTransform3D("Hero", { x: 1, y: 2, z: 3 });
    const component = getTransform3D(node)!;
    const transform = bindRuntimeTransform3D(component);
    transform.position.z = 9;
    expect(component.position.z).toBe(9);
  });

  it("resolveSceneRuntimeTransform3D uses SceneIndex when provided", () => {
    const node = createNodeWithTransform3D("Hero", { x: 1, y: 2, z: 3 });
    const scene = createEmptyScene("World");
    scene.nodes = [node];
    const index = new SceneIndex();
    index.rebuild(scene);
    const transform = resolveSceneRuntimeTransform3D(undefined, node.id, index);
    transform.position.x = 4;
    expect(getTransform3D(node)?.position.x).toBe(4);
  });
});
