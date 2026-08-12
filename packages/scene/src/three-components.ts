/**
 * Three.js visual / light / camera components (serialized, engine-neutral).
 * Keep Pixi leaf visuals in visual-components.ts.
 */

export interface Model3DComponentData {
  type: "Model3D";
  id: string;
  /** glTF / GLB asset id. */
  assetId?: string;
  /** Clip name from the glTF; omit to play the first clip. */
  animation?: string;
  loop: boolean;
  timeScale: number;
  playing: boolean;
}

export interface PerspectiveCameraComponentData {
  type: "PerspectiveCamera";
  id: string;
  fov: number;
  near: number;
  far: number;
  /** When true, this camera is used as the active view camera. */
  active?: boolean;
}

export interface DirectionalLightComponentData {
  type: "DirectionalLight";
  id: string;
  color: number;
  intensity: number;
}

export interface AmbientLightComponentData {
  type: "AmbientLight";
  id: string;
  color: number;
  intensity: number;
}

export type ThreeComponentData =
  | Model3DComponentData
  | PerspectiveCameraComponentData
  | DirectionalLightComponentData
  | AmbientLightComponentData;

/** Leaf Three components that cannot accept scene children. */
export const LEAF_THREE_COMPONENT_TYPES = [
  "Model3D",
  "PerspectiveCamera",
  "DirectionalLight",
  "AmbientLight",
] as const;

export type LeafThreeComponentType =
  (typeof LEAF_THREE_COMPONENT_TYPES)[number];

export function isLeafThreeComponentType(
  type: string,
): type is LeafThreeComponentType {
  return (LEAF_THREE_COMPONENT_TYPES as readonly string[]).includes(type);
}

export function isThreeComponentType(
  type: string,
): type is ThreeComponentData["type"] {
  return isLeafThreeComponentType(type);
}
