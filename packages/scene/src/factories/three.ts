import { createId } from "@game-editor/shared";
import type {
  AmbientLightComponentData,
  DirectionalLightComponentData,
  Model3DComponentData,
  PerspectiveCameraComponentData,
} from "../three-components.js";
import {
  DEFAULT_AMBIENT_LIGHT_COLOR,
  DEFAULT_AMBIENT_LIGHT_INTENSITY,
  DEFAULT_DIRECTIONAL_LIGHT_COLOR,
  DEFAULT_DIRECTIONAL_LIGHT_INTENSITY,
  DEFAULT_MODEL3D_TIME_SCALE,
  DEFAULT_PERSPECTIVE_CAMERA_FAR,
  DEFAULT_PERSPECTIVE_CAMERA_FOV,
  DEFAULT_PERSPECTIVE_CAMERA_NEAR,
} from "../defaults.js";

export function createModel3DComponent(
  partial?: Partial<Omit<Model3DComponentData, "type" | "id">> & { id?: string },
): Model3DComponentData {
  const data: Model3DComponentData = {
    type: "Model3D",
    id: partial?.id ?? createId("comp"),
    loop: partial?.loop ?? true,
    timeScale: partial?.timeScale ?? DEFAULT_MODEL3D_TIME_SCALE,
    playing: partial?.playing ?? true,
  };
  if (partial?.assetId !== undefined) {
    data.assetId = partial.assetId;
  }
  if (partial?.animation !== undefined) {
    data.animation = partial.animation;
  }
  return data;
}

export function createPerspectiveCameraComponent(
  partial?: Partial<Omit<PerspectiveCameraComponentData, "type" | "id">> & {
    id?: string;
  },
): PerspectiveCameraComponentData {
  const data: PerspectiveCameraComponentData = {
    type: "PerspectiveCamera",
    id: partial?.id ?? createId("comp"),
    fov: partial?.fov ?? DEFAULT_PERSPECTIVE_CAMERA_FOV,
    near: partial?.near ?? DEFAULT_PERSPECTIVE_CAMERA_NEAR,
    far: partial?.far ?? DEFAULT_PERSPECTIVE_CAMERA_FAR,
  };
  if (partial?.active !== undefined) {
    data.active = partial.active;
  }
  return data;
}

export function createDirectionalLightComponent(
  partial?: Partial<Omit<DirectionalLightComponentData, "type" | "id">> & {
    id?: string;
  },
): DirectionalLightComponentData {
  return {
    type: "DirectionalLight",
    id: partial?.id ?? createId("comp"),
    color: partial?.color ?? DEFAULT_DIRECTIONAL_LIGHT_COLOR,
    intensity: partial?.intensity ?? DEFAULT_DIRECTIONAL_LIGHT_INTENSITY,
  };
}

export function createAmbientLightComponent(
  partial?: Partial<Omit<AmbientLightComponentData, "type" | "id">> & {
    id?: string;
  },
): AmbientLightComponentData {
  return {
    type: "AmbientLight",
    id: partial?.id ?? createId("comp"),
    color: partial?.color ?? DEFAULT_AMBIENT_LIGHT_COLOR,
    intensity: partial?.intensity ?? DEFAULT_AMBIENT_LIGHT_INTENSITY,
  };
}
