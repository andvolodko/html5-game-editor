import { describe, expect, it } from "vitest";
import { PerspectiveCamera } from "three";
import { resolveActiveCamera } from "./three-active-camera.js";
import { ThreeRuntimeGraph } from "./three-runtime-nodes.js";

describe("resolveActiveCamera", () => {
  it("uses editor camera when preferEditor", () => {
    const editorCamera = new PerspectiveCamera(50, 1, 0.1, 100);
    const graph = new ThreeRuntimeGraph();
    const sceneCam = new PerspectiveCamera(60, 1, 0.1, 100);
    graph.set("cam", {
      object: sceneCam,
      parentId: undefined,
      kind: "PerspectiveCamera",
      cameraActive: true,
    });
    expect(
      resolveActiveCamera({ preferEditor: true, editorCamera, graph }),
    ).toBe(editorCamera);
  });

  it("prefers active camera when not preferEditor", () => {
    const editorCamera = new PerspectiveCamera(50, 1, 0.1, 100);
    const graph = new ThreeRuntimeGraph();
    const first = new PerspectiveCamera(40, 1, 0.1, 100);
    const active = new PerspectiveCamera(70, 1, 0.1, 100);
    graph.set("a", {
      object: first,
      parentId: undefined,
      kind: "PerspectiveCamera",
      cameraActive: false,
    });
    graph.set("b", {
      object: active,
      parentId: undefined,
      kind: "PerspectiveCamera",
      cameraActive: true,
    });
    expect(
      resolveActiveCamera({ preferEditor: false, editorCamera, graph }),
    ).toBe(active);
  });
});
