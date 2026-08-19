import { describe, expect, it } from "vitest";
import {
  createEmptyScene,
  createModel3DComponent,
  createNodeWithTransform3D,
  SceneIndex,
} from "@game-editor/scene";
import { createGltfClipScriptLookups } from "./gltf-clip-script-lookups.js";

describe("createGltfClipScriptLookups", () => {
  it("resolves clip names and duration from the node's Model3D asset", () => {
    const node = createNodeWithTransform3D(
      "M",
      { x: 0, y: 0, z: 0 },
      createModel3DComponent({ assetId: "asset_m", animation: "idle" }),
    );
    const scene = createEmptyScene("S");
    scene.nodes = [node];
    const lookups = createGltfClipScriptLookups(
      () => scene,
      {
        listNames: (assetId) =>
          assetId === "asset_m" ? ["idle", "walk"] : [],
        duration: (assetId, animation) =>
          assetId === "asset_m" && animation === "walk" ? 1.25 : undefined,
      },
    );
    expect(lookups.listModel3DAnimations?.(node.id)).toEqual(["idle", "walk"]);
    expect(lookups.getModel3DAnimationDuration?.(node.id, "walk")).toBe(1.25);
  });

  it("resolves clips through SceneIndex when provided", () => {
    const node = createNodeWithTransform3D(
      "M",
      { x: 0, y: 0, z: 0 },
      createModel3DComponent({ assetId: "asset_m", animation: "idle" }),
    );
    const scene = createEmptyScene("S");
    scene.nodes = [node];
    const index = new SceneIndex();
    index.rebuild(scene);
    const lookups = createGltfClipScriptLookups(
      () => undefined,
      {
        listNames: (assetId) =>
          assetId === "asset_m" ? ["idle", "walk"] : [],
        duration: () => undefined,
      },
      () => index,
    );
    expect(lookups.listModel3DAnimations?.(node.id)).toEqual(["idle", "walk"]);
  });
});
