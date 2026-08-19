import { describe, expect, it } from "vitest";
import { Container } from "pixi.js";
import { PixiRuntimeTransform2D } from "./pixi-runtime-transform-2d.js";

describe("PixiRuntimeTransform2D", () => {
  it("reads and writes through to the display object", () => {
    const object = new Container();
    object.position.set(10, 20);
    object.scale.set(2, 3);
    const transform = new PixiRuntimeTransform2D(object);

    expect(transform.x).toBe(10);
    expect(transform.y).toBe(20);
    expect(transform.scaleX).toBe(2);
    expect(transform.scaleY).toBe(3);

    transform.x = 40;
    transform.y = 50;
    transform.scaleX = -1;
    expect(object.position.x).toBe(40);
    expect(object.position.y).toBe(50);
    expect(object.scale.x).toBe(-1);
  });

  it("does not throw after the display object is destroyed", () => {
    const object = new Container();
    object.position.set(12, 24);
    const transform = new PixiRuntimeTransform2D(object);
    object.destroy();

    expect(transform.x).toBe(12);
    expect(transform.y).toBe(24);
    expect(() => {
      transform.x = 99;
      transform.y = 100;
    }).not.toThrow();
    expect(transform.x).toBe(99);
    expect(transform.y).toBe(100);
  });
});
