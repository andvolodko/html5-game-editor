import { describe, expect, it } from "vitest";
import { Object3D } from "three";
import { ThreeRuntimeTransform3D } from "./three-runtime-transform-3d.js";

describe("ThreeRuntimeTransform3D", () => {
  it("writes axes in place on the Object3D", () => {
    const object = new Object3D();
    object.position.set(1, 2, 3);
    const transform = new ThreeRuntimeTransform3D(object);

    expect(transform.position.z).toBe(3);
    transform.position.z = 10;
    expect(object.position.z).toBe(10);
    expect(transform.position.z).toBe(10);

    transform.setPosition({ x: 4, y: 5, z: 6 });
    expect(object.position.x).toBe(4);
    expect(object.position.y).toBe(5);
    expect(object.position.z).toBe(6);
  });

  it("retargets writes onto a replacement Object3D", () => {
    const first = new Object3D();
    const second = new Object3D();
    const transform = new ThreeRuntimeTransform3D(first);
    transform.setPosition({ x: 1, y: 2, z: 3 });
    transform.retarget(second);
    transform.setPosition({ x: 7, y: 8, z: 9 });
    expect(first.position.x).toBe(1);
    expect(first.position.z).toBe(3);
    expect(second.position.x).toBe(7);
    expect(second.position.y).toBe(8);
    expect(second.position.z).toBe(9);
    expect(transform.position.z).toBe(9);
  });
});
