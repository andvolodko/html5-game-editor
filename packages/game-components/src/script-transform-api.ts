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
} from "./types.js";

type Vec3 = ScriptTransform3D["position"];

function cloneVec3(value: Readonly<Vec3>): Vec3 {
  return { x: value.x, y: value.y, z: value.z };
}

class HostScriptTransformApi implements ScriptTransformApi {
  constructor(
    private readonly nodeId: string,
    private readonly services: ScriptRuntimeServices,
  ) {}

  get position(): Readonly<Vec3> {
    return cloneVec3(
      this.read()?.position ?? IDENTITY_POSITION_3D,
    );
  }

  get rotation(): Readonly<Vec3> {
    return cloneVec3(
      this.read()?.rotation ?? IDENTITY_ROTATION_3D,
    );
  }

  get scale(): Readonly<Vec3> {
    return cloneVec3(this.read()?.scale ?? IDENTITY_SCALE_3D);
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
