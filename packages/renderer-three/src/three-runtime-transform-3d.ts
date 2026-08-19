import type { Object3D } from "three";
import {
  bindRuntimeVec3,
  type RuntimeTransform3D,
  type RuntimeTransform3DPatch,
  type Vec3,
} from "@game-editor/scene";

/**
 * Persistent adapter from engine-neutral RuntimeTransform3D onto a Three
 * Object3D. Created once per runtime node. Axis assignment writes in place.
 */
export class ThreeRuntimeTransform3D implements RuntimeTransform3D {
  readonly position: RuntimeTransform3D["position"];
  readonly rotation: RuntimeTransform3D["rotation"];
  readonly scale: RuntimeTransform3D["scale"];

  constructor(private object: Object3D) {
    this.position = bindRuntimeVec3(
      () => this.object.position.x,
      (value) => {
        this.object.position.x = value;
      },
      () => this.object.position.y,
      (value) => {
        this.object.position.y = value;
      },
      () => this.object.position.z,
      (value) => {
        this.object.position.z = value;
      },
    );
    this.rotation = bindRuntimeVec3(
      () => this.object.rotation.x,
      (value) => {
        this.object.rotation.x = value;
      },
      () => this.object.rotation.y,
      (value) => {
        this.object.rotation.y = value;
      },
      () => this.object.rotation.z,
      (value) => {
        this.object.rotation.z = value;
      },
    );
    this.scale = bindRuntimeVec3(
      () => this.object.scale.x,
      (value) => {
        this.object.scale.x = value;
      },
      () => this.object.scale.y,
      (value) => {
        this.object.scale.y = value;
      },
      () => this.object.scale.z,
      (value) => {
        this.object.scale.z = value;
      },
    );
  }

  setPosition(position: Vec3): void {
    this.object.position.set(position.x, position.y, position.z);
  }

  setRotation(rotation: Vec3): void {
    this.object.rotation.set(rotation.x, rotation.y, rotation.z);
  }

  setScale(scale: Vec3): void {
    this.object.scale.set(scale.x, scale.y, scale.z);
  }

  set(transform: RuntimeTransform3DPatch): void {
    if (transform.position) {
      this.setPosition(transform.position);
    }
    if (transform.rotation) {
      this.setRotation(transform.rotation);
    }
    if (transform.scale) {
      this.setScale(transform.scale);
    }
  }

  /** Keep script `ctx.transform3D` bound when the visual Object3D is replaced. */
  retarget(object: Object3D): void {
    this.object = object;
  }
}
