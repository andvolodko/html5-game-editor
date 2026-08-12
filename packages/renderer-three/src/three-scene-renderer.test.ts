import { describe, expect, it } from "vitest";
import {
  createEmptyScene,
  createNodeWithTransform3D,
  createModel3DComponent,
  createPerspectiveCameraComponent,
  createDirectionalLightComponent,
  createAmbientLightComponent,
  findNodeById,
} from "@game-editor/scene";
import { ThreeSceneRenderer } from "./three-scene-renderer.js";

describe("ThreeSceneRenderer", () => {
  it("reparents without mutating domain SceneNodeData", () => {
    const scene = createEmptyScene("T", { renderer: "three" });
    const parent = createNodeWithTransform3D("P", { x: 0, y: 0, z: 0 });
    const child = createNodeWithTransform3D(
      "C",
      { x: 1, y: 0, z: 0 },
      createModel3DComponent(),
    );
    child.parentId = parent.id;
    parent.children = [child];
    scene.nodes = [parent];

    const renderer = new ThreeSceneRenderer({ headless: true });
    renderer.createNode(parent);
    renderer.createNode(child);

    const parentIdBefore = child.parentId;
    renderer.reparentNode(child.id, undefined, 0);

    expect(child.parentId).toBe(parentIdBefore);
    expect(renderer.getRuntimeParentId(child.id)).toBeUndefined();
    expect(findNodeById(scene, child.id)?.parentId).toBe(parentIdBefore);
  });

  it("creates Model3D placeholder nodes", () => {
    const node = createNodeWithTransform3D(
      "M",
      { x: 2, y: 0, z: 3 },
      createModel3DComponent(),
    );
    const renderer = new ThreeSceneRenderer({ headless: true });
    renderer.createNode(node);
    expect(renderer.getNodeCount()).toBe(1);
    renderer.destroyNode(node.id);
    expect(renderer.getNodeCount()).toBe(0);
  });

  it("creates camera and light nodes without crashing", () => {
    const camera = createNodeWithTransform3D(
      "Cam",
      { x: 0, y: 5, z: 10 },
      createPerspectiveCameraComponent({ active: true }),
    );
    const sun = createNodeWithTransform3D(
      "Sun",
      { x: 5, y: 10, z: 5 },
      createDirectionalLightComponent(),
    );
    const ambient = createNodeWithTransform3D(
      "Ambient",
      { x: 0, y: 0, z: 0 },
      createAmbientLightComponent(),
    );
    const renderer = new ThreeSceneRenderer({ headless: true });
    renderer.createNode(camera);
    renderer.createNode(sun);
    renderer.createNode(ambient);
    expect(renderer.getNodeCount()).toBe(3);
    renderer.destroyNode(camera.id);
    renderer.destroyNode(sun.id);
    renderer.destroyNode(ambient.id);
    expect(renderer.getNodeCount()).toBe(0);
  });

  it("applies viewport aspect to scene cameras on resize", () => {
    const camera = createNodeWithTransform3D(
      "Cam",
      { x: 0, y: 5, z: 10 },
      createPerspectiveCameraComponent({ active: true }),
    );
    const renderer = new ThreeSceneRenderer({
      headless: true,
      editable: false,
    });
    renderer.createNode(camera);
    expect(renderer.getRuntimeCameraAspect(camera.id)).toBe(1);
    renderer.resize(1600, 900);
    expect(renderer.getRuntimeCameraAspect(camera.id)).toBeCloseTo(1600 / 900);
    renderer.resize(0, 900);
    expect(renderer.getSize()).toEqual({ width: 1600, height: 900 });
  });
});
