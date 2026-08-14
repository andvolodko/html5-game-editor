import { describe, expect, it } from "vitest";
import {
  createEmptyScene,
  createNodeWithTransform3D,
  createModel3DComponent,
  createScriptComponent,
  createSpriteNode,
  findNodeByName,
  getModel3D,
  getSprite,
  getTransform2D,
  getTransform3D,
} from "@game-editor/scene";
import { cloneNamedNodeInScene } from "./script-scene-clone.js";

describe("cloneNamedNodeInScene", () => {
  it("clones a 2D node with a new id, name, and offset", () => {
    const source = createSpriteNode("House", { x: 100, y: 50 }, {
      assetId: "asset_house",
    });
    const scene = createEmptyScene("Clone2D");
    scene.nodes = [source];

    const clone = cloneNamedNodeInScene(scene, "House", 0);
    expect(clone).toBeDefined();
    expect(clone?.id).not.toBe(source.id);
    expect(clone?.name).toBe("House Copy");
    expect(getSprite(clone!)?.assetId).toBe("asset_house");
    expect(getTransform2D(clone!)?.position).toEqual({ x: 132, y: 50 });
    expect(scene.nodes).toHaveLength(2);
    expect(findNodeByName(scene, "House")?.id).toBe(source.id);
  });

  it("wraps to the next row after 15 clones on X", () => {
    const source = createSpriteNode("House", { x: 0, y: 0 }, {
      assetId: "asset_house",
    });
    const scene = createEmptyScene("CloneGrid");
    scene.nodes = [source];

    const firstRowLast = cloneNamedNodeInScene(scene, "House", 14, 15);
    const secondRowFirst = cloneNamedNodeInScene(scene, "House", 15, 15);
    expect(getTransform2D(firstRowLast!)?.position).toEqual({ x: 480, y: 0 });
    expect(getTransform2D(secondRowFirst!)?.position).toEqual({ x: 32, y: 32 });
  });

  it("clones a 3D Model3D and strips Script components", () => {
    const source = createNodeWithTransform3D("Monster01", { x: 0, y: 0, z: 0 });
    source.components.push(
      createModel3DComponent({
        assetId: "asset_monster",
        loop: true,
        playing: true,
      }),
    );
    source.components.push(createScriptComponent("demo.IgnoreMe"));
    const scene = createEmptyScene("Clone3D", { renderer: "three" });
    scene.nodes = [source];

    const clone = cloneNamedNodeInScene(scene, "Monster01", 0);
    expect(clone?.name).toBe("Monster01 Copy");
    expect(getModel3D(clone!)?.assetId).toBe("asset_monster");
    expect(getModel3D(clone!)?.playing).toBe(true);
    expect(clone?.components.some((component) => component.type === "Script")).toBe(
      false,
    );
    expect(getTransform3D(clone!)?.position).toEqual({
      x: 0.5,
      y: 0,
      z: 0,
    });
    expect(source.components.some((component) => component.type === "Script")).toBe(
      true,
    );
  });

  it("returns undefined for a missing name", () => {
    const scene = createEmptyScene("Empty");
    expect(cloneNamedNodeInScene(scene, "Missing", 0)).toBeUndefined();
    expect(cloneNamedNodeInScene(scene, "", 0)).toBeUndefined();
  });
});
