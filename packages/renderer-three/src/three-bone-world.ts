import { Euler, Quaternion, Vector3, type Object3D } from "three";
import type { BoneWorldTransform } from "@game-editor/scene";

const position = new Vector3();
const quaternion = new Quaternion();
const scale = new Vector3();
const euler = new Euler();

/** World pose of a named descendant (glTF bone), without exposing THREE to scripts. */
export function readBoneWorldTransform(
  root: Object3D,
  boneName: string,
): BoneWorldTransform | undefined {
  if (boneName.length === 0) {
    return undefined;
  }
  const bone = root.getObjectByName(boneName);
  if (!bone) {
    return undefined;
  }
  bone.updateWorldMatrix(true, false);
  bone.matrixWorld.decompose(position, quaternion, scale);
  euler.setFromQuaternion(quaternion, "XYZ");
  return {
    position: { x: position.x, y: position.y, z: position.z },
    rotation: { x: euler.x, y: euler.y, z: euler.z },
  };
}
