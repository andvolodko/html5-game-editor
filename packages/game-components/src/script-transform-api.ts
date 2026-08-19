import {
  IDENTITY_POSITION_3D,
  IDENTITY_ROTATION_3D,
  IDENTITY_SCALE_3D,
} from "@game-editor/scene";
import type {
  ScriptRuntimeServices,
  ScriptTransform3D,
  ScriptTransformApi,
  ScriptTransform3DPatch,
  ScriptVec3,
} from "./types.js";

type Vec3 = ScriptTransform3D["position"];

function bindLiveScriptVec3(
  read: () => Vec3,
  write: (next: Vec3) => void,
): ScriptVec3 {
  return {
    get x(): number {
      return read().x;
    },
    set x(value: number) {
      const current = read();
      write({ x: value, y: current.y, z: current.z });
    },
    get y(): number {
      return read().y;
    },
    set y(value: number) {
      const current = read();
      write({ x: current.x, y: value, z: current.z });
    },
    get z(): number {
      return read().z;
    },
    set z(value: number) {
      const current = read();
      write({ x: current.x, y: current.y, z: value });
    },
  };
}

class HostScriptTransformApi implements ScriptTransformApi {
  readonly position: ScriptVec3;
  readonly rotation: ScriptVec3;
  readonly scale: ScriptVec3;

  constructor(
    private readonly nodeId: string,
    private readonly services: ScriptRuntimeServices,
  ) {
    this.position = bindLiveScriptVec3(
      () => this.read()?.position ?? IDENTITY_POSITION_3D,
      (position) => {
        this.services.setTransform3D?.(this.nodeId, { position });
      },
    );
    this.rotation = bindLiveScriptVec3(
      () => this.read()?.rotation ?? IDENTITY_ROTATION_3D,
      (rotation) => {
        this.services.setTransform3D?.(this.nodeId, { rotation });
      },
    );
    this.scale = bindLiveScriptVec3(
      () => this.read()?.scale ?? IDENTITY_SCALE_3D,
      (scale) => {
        this.services.setTransform3D?.(this.nodeId, { scale });
      },
    );
  }

  setPosition(position: Vec3): void {
    this.services.setTransform3D?.(this.nodeId, { position });
  }

  setRotation(rotation: Vec3): void {
    this.services.setTransform3D?.(this.nodeId, { rotation });
  }

  setScale(scale: Vec3): void {
    this.services.setTransform3D?.(this.nodeId, { scale });
  }

  set(transform: ScriptTransform3DPatch): void {
    this.services.setTransform3D?.(this.nodeId, transform);
  }

  private read(): ScriptTransform3D | undefined {
    return this.services.getTransform3D?.(this.nodeId);
  }
}

export function createScriptTransformApi(
  nodeId: string,
  services: ScriptRuntimeServices,
): ScriptTransformApi {
  return new HostScriptTransformApi(nodeId, services);
}
