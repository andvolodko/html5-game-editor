import {
  IDENTITY_POSITION_3D,
  IDENTITY_ROTATION_3D,
  IDENTITY_SCALE_3D,
} from "./defaults.js";
import { findNodeById, getTransform3D } from "./queries.js";
import type { SceneIndex } from "./scene-index.js";
import type {
  SceneData,
  Transform3DComponentData,
  Vec3,
} from "./types.js";

/** Live 3D vector that writes through to a persistent transform handle. */
export interface RuntimeVec3 {
  x: number;
  y: number;
  z: number;
}

export interface RuntimeTransform3DPatch {
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
}

/**
 * Live 3D pose of a runtime node. Getters/setters write through to the
 * actual runtime object (or the scene Transform3D when no renderer handle
 * exists). Instances are persistent: do not allocate a new object per frame.
 */
export interface RuntimeTransform3D {
  readonly position: RuntimeVec3;
  readonly rotation: RuntimeVec3;
  readonly scale: RuntimeVec3;
  setPosition(position: Vec3): void;
  setRotation(rotation: Vec3): void;
  setScale(scale: Vec3): void;
  set(transform: RuntimeTransform3DPatch): void;
}

export function bindRuntimeVec3(
  getX: () => number,
  setX: (value: number) => void,
  getY: () => number,
  setY: (value: number) => void,
  getZ: () => number,
  setZ: (value: number) => void,
): RuntimeVec3 {
  return {
    get x(): number {
      return getX();
    },
    set x(value: number) {
      setX(value);
    },
    get y(): number {
      return getY();
    },
    set y(value: number) {
      setY(value);
    },
    get z(): number {
      return getZ();
    },
    set z(value: number) {
      setZ(value);
    },
  };
}

function cloneVec3(value: Vec3): Vec3 {
  return { x: value.x, y: value.y, z: value.z };
}

class DetachedRuntimeTransform3D implements RuntimeTransform3D {
  private pos: Vec3;
  private rot: Vec3;
  private scl: Vec3;
  readonly position: RuntimeVec3;
  readonly rotation: RuntimeVec3;
  readonly scale: RuntimeVec3;

  constructor(initial?: Partial<RuntimeTransform3DPatch>) {
    this.pos = cloneVec3(initial?.position ?? IDENTITY_POSITION_3D);
    this.rot = cloneVec3(initial?.rotation ?? IDENTITY_ROTATION_3D);
    this.scl = cloneVec3(initial?.scale ?? IDENTITY_SCALE_3D);
    this.position = bindRuntimeVec3(
      () => this.pos.x,
      (value) => {
        this.pos.x = value;
      },
      () => this.pos.y,
      (value) => {
        this.pos.y = value;
      },
      () => this.pos.z,
      (value) => {
        this.pos.z = value;
      },
    );
    this.rotation = bindRuntimeVec3(
      () => this.rot.x,
      (value) => {
        this.rot.x = value;
      },
      () => this.rot.y,
      (value) => {
        this.rot.y = value;
      },
      () => this.rot.z,
      (value) => {
        this.rot.z = value;
      },
    );
    this.scale = bindRuntimeVec3(
      () => this.scl.x,
      (value) => {
        this.scl.x = value;
      },
      () => this.scl.y,
      (value) => {
        this.scl.y = value;
      },
      () => this.scl.z,
      (value) => {
        this.scl.z = value;
      },
    );
  }

  setPosition(position: Vec3): void {
    this.pos.x = position.x;
    this.pos.y = position.y;
    this.pos.z = position.z;
  }

  setRotation(rotation: Vec3): void {
    this.rot.x = rotation.x;
    this.rot.y = rotation.y;
    this.rot.z = rotation.z;
  }

  setScale(scale: Vec3): void {
    this.scl.x = scale.x;
    this.scl.y = scale.y;
    this.scl.z = scale.z;
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
}

class SceneComponentRuntimeTransform3D implements RuntimeTransform3D {
  readonly position: RuntimeVec3;
  readonly rotation: RuntimeVec3;
  readonly scale: RuntimeVec3;

  constructor(private readonly transform: Transform3DComponentData) {
    this.position = bindRuntimeVec3(
      () => this.transform.position.x,
      (value) => {
        this.transform.position.x = value;
      },
      () => this.transform.position.y,
      (value) => {
        this.transform.position.y = value;
      },
      () => this.transform.position.z,
      (value) => {
        this.transform.position.z = value;
      },
    );
    this.rotation = bindRuntimeVec3(
      () => this.transform.rotation.x,
      (value) => {
        this.transform.rotation.x = value;
      },
      () => this.transform.rotation.y,
      (value) => {
        this.transform.rotation.y = value;
      },
      () => this.transform.rotation.z,
      (value) => {
        this.transform.rotation.z = value;
      },
    );
    this.scale = bindRuntimeVec3(
      () => this.transform.scale.x,
      (value) => {
        this.transform.scale.x = value;
      },
      () => this.transform.scale.y,
      (value) => {
        this.transform.scale.y = value;
      },
      () => this.transform.scale.z,
      (value) => {
        this.transform.scale.z = value;
      },
    );
  }

  setPosition(position: Vec3): void {
    this.transform.position.x = position.x;
    this.transform.position.y = position.y;
    this.transform.position.z = position.z;
  }

  setRotation(rotation: Vec3): void {
    this.transform.rotation.x = rotation.x;
    this.transform.rotation.y = rotation.y;
    this.transform.rotation.z = rotation.z;
  }

  setScale(scale: Vec3): void {
    this.transform.scale.x = scale.x;
    this.transform.scale.y = scale.y;
    this.transform.scale.z = scale.z;
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
}

/** Standalone mutable transform for tests and nodes without Transform3D. */
export function createDetachedRuntimeTransform3D(
  initial?: Partial<RuntimeTransform3DPatch>,
): RuntimeTransform3D {
  return new DetachedRuntimeTransform3D(initial);
}

/** Persistent adapter over a scene Transform3D component. */
export function bindRuntimeTransform3D(
  transform: Transform3DComponentData,
): RuntimeTransform3D {
  return new SceneComponentRuntimeTransform3D(transform);
}

/** Scene-data fallback when no renderer exposes a live transform handle. */
export function resolveSceneRuntimeTransform3D(
  scene: SceneData | undefined,
  nodeId: string,
  index?: SceneIndex,
): RuntimeTransform3D {
  const node = index
    ? index.getNode(nodeId)
    : scene
      ? findNodeById(scene, nodeId)
      : undefined;
  const transform = node ? getTransform3D(node) : undefined;
  if (!transform) {
    return createDetachedRuntimeTransform3D();
  }
  return bindRuntimeTransform3D(transform);
}
