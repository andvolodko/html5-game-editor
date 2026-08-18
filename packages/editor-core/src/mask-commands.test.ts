import { describe, expect, it } from "vitest";
import {
  createEmptyScene,
  getMask,
  getSprite,
} from "@game-editor/scene";
import { Editor } from "./editor.js";

describe("mask commands", () => {
  it("adds a Mask from sprite size, undoes, and redoes", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const nodeId = editor.createSprite("Hero");
    const sprite = getSprite(editor.getScene().nodes[0]!)!;

    const componentId = editor.addMask(nodeId);
    const mask = getMask(editor.getScene().nodes[0]!);
    expect(mask?.id).toBe(componentId);
    expect(mask?.mode).toBe("shape");
    expect(mask?.shape).toEqual({
      type: "rectangle",
      width: sprite.width,
      height: sprite.height,
    });

    editor.undo();
    expect(getMask(editor.getScene().nodes[0]!)).toBeUndefined();

    editor.redo();
    expect(getMask(editor.getScene().nodes[0]!)?.id).toBe(componentId);
  });

  it("rejects a second Mask and Transform3D-only nodes", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const spriteId = editor.createSprite("Hero");
    editor.addMask(spriteId);
    expect(() => editor.addMask(spriteId)).toThrow(/already on node/);

    const threeId = editor.createNode("three.container");
    expect(() => editor.addMask(threeId)).toThrow(/Transform2D/);
  });

  it("patches Mask with undo and omits identity defaults", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const nodeId = editor.createSprite("Hero");
    editor.addMask(nodeId);

    editor.setMask(nodeId, {
      enabled: false,
      inverse: true,
      offset: { x: 4, y: 6 },
      shape: { type: "circle", radius: 12 },
    });
    expect(getMask(editor.getScene().nodes[0]!)).toMatchObject({
      enabled: false,
      inverse: true,
      offset: { x: 4, y: 6 },
      shape: { type: "circle", radius: 12 },
    });

    editor.setMask(nodeId, {
      enabled: true,
      inverse: false,
      offset: { x: 0, y: 0 },
    });
    const compact = getMask(editor.getScene().nodes[0]!);
    expect(compact?.enabled).toBeUndefined();
    expect(compact?.inverse).toBeUndefined();
    expect(compact?.offset).toBeUndefined();

    editor.undo();
    expect(getMask(editor.getScene().nodes[0]!)?.enabled).toBe(false);
  });

  it("switches to sprite mode and drops shape", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const nodeId = editor.createSprite("Hero");
    editor.addMask(nodeId);
    editor.setMask(nodeId, {
      mode: "sprite",
      assetId: "asset_tex",
      width: 32,
      height: 16,
    });
    const mask = getMask(editor.getScene().nodes[0]!);
    expect(mask).toMatchObject({
      mode: "sprite",
      assetId: "asset_tex",
      width: 32,
      height: 16,
    });
    expect(mask?.shape).toBeUndefined();
  });

  it("removes Mask with undo restoring order", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const nodeId = editor.createSprite("Hero");
    const maskId = editor.addMask(nodeId);
    const before = editor.getScene().nodes[0]!.components.map((c) => c.id);

    editor.removeComponent(nodeId, maskId);
    expect(getMask(editor.getScene().nodes[0]!)).toBeUndefined();

    editor.undo();
    expect(editor.getScene().nodes[0]!.components.map((c) => c.id)).toEqual(
      before,
    );
  });
});
