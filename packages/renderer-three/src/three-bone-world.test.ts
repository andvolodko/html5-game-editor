import { describe, expect, it } from "vitest";
import { Bone, Group } from "three";
import { readBoneWorldTransform } from "./three-bone-world.js";

describe("readBoneWorldTransform", () => {
  it("reads a named bone's world position and euler rotation", () => {
    const root = new Group();
    root.position.set(10, 0, 0);
    const bone = new Bone();
    bone.name = "bone_12_Bone02";
    bone.position.set(0, 2, 0);
    root.add(bone);
    root.updateMatrixWorld(true);

    const pose = readBoneWorldTransform(root, "bone_12_Bone02");
    expect(pose?.position).toEqual({ x: 10, y: 2, z: 0 });
    expect(pose?.rotation.x).toBeCloseTo(0);
    expect(pose?.rotation.y).toBeCloseTo(0);
    expect(pose?.rotation.z).toBeCloseTo(0);
  });

  it("returns undefined when the bone is missing", () => {
    const root = new Group();
    expect(readBoneWorldTransform(root, "bone_12_Bone02")).toBeUndefined();
    expect(readBoneWorldTransform(root, "")).toBeUndefined();
  });
});
