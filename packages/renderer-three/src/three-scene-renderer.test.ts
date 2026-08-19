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

  it("exposes a stable live Transform3D handle that writes the Object3D pose", () => {
    const node = createNodeWithTransform3D(
      "M",
      { x: 2, y: 0, z: 3 },
      createModel3DComponent(),
    );
    const renderer = new ThreeSceneRenderer({ headless: true });
    renderer.createNode(node);
    const first = renderer.getRuntimeTransform3D(node.id);
    const second = renderer.getRuntimeTransform3D(node.id);
    expect(first).toBeDefined();
    expect(first).toBe(second);
    first!.position.z = 11;
    expect(second!.position.z).toBe(11);
    renderer.destroyNode(node.id);
  });

  it("keeps the live playback pose when updateNode refreshes Model3D playback", () => {
    const node = createNodeWithTransform3D(
      "M",
      { x: 2, y: 0, z: 3 },
      createModel3DComponent(),
    );
    const renderer = new ThreeSceneRenderer({
      headless: true,
      editable: false,
    });
    renderer.createNode(node);
    const handle = renderer.getRuntimeTransform3D(node.id)!;
    handle.setPosition({ x: 10, y: 1, z: 20 });
    handle.setRotation({ x: 0.1, y: 0.2, z: 0.3 });

    renderer.updateNode(node);

    expect(handle.position.x).toBe(10);
    expect(handle.position.y).toBe(1);
    expect(handle.position.z).toBe(20);
    expect(handle.rotation.z).toBeCloseTo(0.3);
    renderer.destroyNode(node.id);
  });

  it("keeps the live Transform3D handle when the Model3D visual is replaced", () => {
    const node = createNodeWithTransform3D(
      "M",
      { x: 2, y: 0, z: 3 },
      createModel3DComponent({ assetId: "asset_missing" }),
    );
    const renderer = new ThreeSceneRenderer({ headless: true });
    renderer.createNode(node);
    const handle = renderer.getRuntimeTransform3D(node.id);
    expect(handle).toBeDefined();
    handle!.setPosition({ x: 4, y: 5, z: 6 });

    renderer.updateNode({
      ...node,
      components: [
        ...node.components.filter((component) => component.type !== "Model3D"),
        createPerspectiveCameraComponent({ active: true }),
      ],
    });

    expect(renderer.getRuntimeTransform3D(node.id)).toBe(handle);
    handle!.setPosition({ x: 10, y: 11, z: 12 });
    expect(handle!.position).toEqual({ x: 10, y: 11, z: 12 });
    renderer.destroyNode(node.id);
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

  it("samples Object3D count without inventing GPU stats in headless mode", () => {
    const node = createNodeWithTransform3D(
      "M",
      { x: 0, y: 0, z: 0 },
      createModel3DComponent(),
    );
    const renderer = new ThreeSceneRenderer({ headless: true });
    const empty = renderer.getRenderStats();
    expect(empty.drawCalls).toBe(0);
    expect(empty.triangles).toBe(0);
    expect(empty.canvas).toBe(0);
    expect(empty.displayObjects).toBeGreaterThan(0);

    renderer.createNode(node);
    const withNode = renderer.getRenderStats();
    expect(withNode.displayObjects).toBeGreaterThan(empty.displayObjects);
    expect(withNode.drawCalls).toBe(0);
    expect(withNode.triangles).toBe(0);
  });
});
