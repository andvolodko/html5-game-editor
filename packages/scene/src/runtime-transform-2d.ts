import { findNodeById, getTransform2D } from "./queries.js";
import {
  IDENTITY_POSITION_2D,
  IDENTITY_ROTATION_2D,
  IDENTITY_SCALE_2D,
} from "./defaults.js";
import type { SceneData, Transform2DComponentData } from "./types.js";

/** Live 2D vector that writes through to a persistent transform handle. */
export interface RuntimeVec2 {
  x: number;
  y: number;
}

/**
 * Live 2D pose of a runtime node. Getters/setters write through to the
 * actual runtime object (or the scene Transform2D when no renderer handle
 * exists). Rotation is degrees — renderer adapters convert as needed.
 *
 * Instances are persistent: do not allocate a new object per frame.
 * `x` / `y` / `scaleX` / `scaleY` remain supported aliases of `position` / `scale`.
 */
export interface RuntimeTransform2D {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  readonly position: RuntimeVec2;
  readonly scale: RuntimeVec2;
}

export function bindRuntimeVec2(
  getX: () => number,
  setX: (value: number) => void,
  getY: () => number,
  setY: (value: number) => void,
): RuntimeVec2 {
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
  };
}

class DetachedRuntimeTransform2D implements RuntimeTransform2D {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  readonly position: RuntimeVec2;
  readonly scale: RuntimeVec2;

  constructor(initial?: Partial<RuntimeTransform2D>) {
    this.x = initial?.x ?? IDENTITY_POSITION_2D.x;
    this.y = initial?.y ?? IDENTITY_POSITION_2D.y;
    this.rotation = initial?.rotation ?? IDENTITY_ROTATION_2D;
    this.scaleX = initial?.scaleX ?? IDENTITY_SCALE_2D.x;
    this.scaleY = initial?.scaleY ?? IDENTITY_SCALE_2D.y;
    this.position = bindRuntimeVec2(
      () => this.x,
      (value) => {
        this.x = value;
      },
      () => this.y,
      (value) => {
        this.y = value;
      },
    );
    this.scale = bindRuntimeVec2(
      () => this.scaleX,
      (value) => {
        this.scaleX = value;
      },
      () => this.scaleY,
      (value) => {
        this.scaleY = value;
      },
    );
  }
}

class SceneComponentRuntimeTransform2D implements RuntimeTransform2D {
  readonly position: RuntimeVec2;
  readonly scale: RuntimeVec2;

  constructor(private readonly transform: Transform2DComponentData) {
    this.position = bindRuntimeVec2(
      () => this.x,
      (value) => {
        this.x = value;
      },
      () => this.y,
      (value) => {
        this.y = value;
      },
    );
    this.scale = bindRuntimeVec2(
      () => this.scaleX,
      (value) => {
        this.scaleX = value;
      },
      () => this.scaleY,
      (value) => {
        this.scaleY = value;
      },
    );
  }

  get x(): number {
    return this.transform.position.x;
  }

  set x(value: number) {
    this.transform.position.x = value;
  }

  get y(): number {
    return this.transform.position.y;
  }

  set y(value: number) {
    this.transform.position.y = value;
  }

  get rotation(): number {
    return this.transform.rotation;
  }

  set rotation(value: number) {
    this.transform.rotation = value;
  }

  get scaleX(): number {
    return this.transform.scale.x;
  }

  set scaleX(value: number) {
    this.transform.scale.x = value;
  }

  get scaleY(): number {
    return this.transform.scale.y;
  }

  set scaleY(value: number) {
    this.transform.scale.y = value;
  }
}

/** Standalone mutable transform for tests and nodes without Transform2D. */
export function createDetachedRuntimeTransform2D(
  initial?: Partial<RuntimeTransform2D>,
): RuntimeTransform2D {
  return new DetachedRuntimeTransform2D(initial);
}

/**
 * Persistent adapter over a scene Transform2D component.
 * Assignments mutate the component in place (no patch objects).
 */
export function bindRuntimeTransform2D(
  transform: Transform2DComponentData,
): RuntimeTransform2D {
  return new SceneComponentRuntimeTransform2D(transform);
}

/** Scene-data fallback when no renderer exposes a live transform handle. */
export function resolveSceneRuntimeTransform2D(
  scene: SceneData | undefined,
  nodeId: string,
): RuntimeTransform2D {
  const node = scene ? findNodeById(scene, nodeId) : undefined;
  const transform = node ? getTransform2D(node) : undefined;
  if (!transform) {
    return createDetachedRuntimeTransform2D();
  }
  return bindRuntimeTransform2D(transform);
}
