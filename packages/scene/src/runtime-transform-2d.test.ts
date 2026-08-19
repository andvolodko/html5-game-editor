import { describe, expect, it } from "vitest";
import { createSpriteNode, createEmptyScene } from "./factories/scene.js";
import { getTransform2D } from "./queries.js";
import {
  bindRuntimeTransform2D,
  createDetachedRuntimeTransform2D,
  resolveSceneRuntimeTransform2D,
} from "./runtime-transform-2d.js";

describe("RuntimeTransform2D", () => {
  it("keeps a stable detached object identity", () => {
    const transform = createDetachedRuntimeTransform2D({ x: 4, y: 8 });
    expect(transform).toBe(transform);
    expect(transform.x).toBe(4);
    expect(transform.y).toBe(8);
    expect(transform.scaleX).toBe(1);
    expect(transform.scaleY).toBe(1);
    transform.x = 12;
    expect(transform.x).toBe(12);
  });

  it("writes through to the scene Transform2D component", () => {
    const node = createSpriteNode("Hero", { x: 10, y: 20 });
    const component = getTransform2D(node)!;
    const transform = bindRuntimeTransform2D(component);

    expect(transform).toBe(transform);
    expect(transform.x).toBe(10);
    expect(transform.y).toBe(20);

    transform.x = 30;
    transform.y = 40;
    transform.rotation = 90;
    transform.scaleX = -2;
    transform.scaleY = 3;

    expect(component.position).toEqual({ x: 30, y: 40 });
    expect(component.rotation).toBe(90);
    expect(component.scale).toEqual({ x: -2, y: 3 });
  });

  it("resolveSceneRuntimeTransform2D binds the node's Transform2D", () => {
    const node = createSpriteNode("Cloud", { x: 5, y: 6 });
    const scene = createEmptyScene("Sky");
    scene.nodes = [node];
    const transform = resolveSceneRuntimeTransform2D(scene, node.id);
    transform.x = 7;
    expect(getTransform2D(node)?.position.x).toBe(7);
  });

  it("resolveSceneRuntimeTransform2D falls back to a detached transform", () => {
    const transform = resolveSceneRuntimeTransform2D(undefined, "missing");
    transform.x = 1;
    expect(transform.x).toBe(1);
  });
});
