import type { Transform3DComponentData } from "@game-editor/scene";

export function cloneTransform3D(
  transform: Transform3DComponentData,
): Transform3DComponentData {
  return {
    type: "Transform3D",
    id: transform.id,
    position: { ...transform.position },
    rotation: { ...transform.rotation },
    scale: { ...transform.scale },
  };
}
