import type { Container } from "pixi.js";
import type { RuntimeTransform2D } from "@game-editor/scene";

const DEGREES_TO_RADIANS = Math.PI / 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;

/**
 * Persistent adapter from engine-neutral RuntimeTransform2D (degrees)
 * onto a Pixi display object. Created once per runtime node.
 */
export class PixiRuntimeTransform2D implements RuntimeTransform2D {
  constructor(private readonly displayObject: Container) {}

  get x(): number {
    return this.displayObject.position.x;
  }

  set x(value: number) {
    this.displayObject.position.x = value;
  }

  get y(): number {
    return this.displayObject.position.y;
  }

  set y(value: number) {
    this.displayObject.position.y = value;
  }

  get rotation(): number {
    return this.displayObject.rotation * RADIANS_TO_DEGREES;
  }

  set rotation(value: number) {
    this.displayObject.rotation = value * DEGREES_TO_RADIANS;
  }

  get scaleX(): number {
    return this.displayObject.scale.x;
  }

  set scaleX(value: number) {
    this.displayObject.scale.x = value;
  }

  get scaleY(): number {
    return this.displayObject.scale.y;
  }

  set scaleY(value: number) {
    this.displayObject.scale.y = value;
  }
}
