import { describe, expect, it } from "vitest";
import { Group, Object3D } from "three";
import { countObject3Ds, sampleThreeRenderStats } from "./three-render-stats.js";

describe("countObject3Ds", () => {
  it("counts the root and every descendant Object3D", () => {
    const root = new Object3D();
    const childA = new Group();
    const childB = new Group();
    const grandChild = new Object3D();
    root.add(childA, childB);
    childA.add(grandChild);
    expect(countObject3Ds(root)).toBe(4);
  });
});

describe("sampleThreeRenderStats", () => {
  it("reports no GPU counters without a WebGLRenderer", () => {
    const root = new Object3D();
    root.add(new Group());
    expect(sampleThreeRenderStats(undefined, root)).toEqual({
      drawCalls: 0,
      triangles: 0,
      canvas: 0,
      displayObjects: 2,
    });
  });
});
