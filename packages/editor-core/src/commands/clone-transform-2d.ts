import type { Transform2DComponentData } from "@game-editor/scene";

export function cloneTransform2D(
  transform: Transform2DComponentData,
): Transform2DComponentData {
  return {
    type: "Transform2D",
    id: transform.id,
    position: { ...transform.position },
    rotation: transform.rotation,
    scale: { ...transform.scale },
    ...(transform.anchor !== undefined ? { anchor: { ...transform.anchor } } : {}),
  };
}
