import { describe, expect, it } from "vitest";
import {
  createEmptyScene,
  getHitZone,
  getSprite,
} from "@game-editor/scene";
import { Editor } from "./editor.js";

describe("hit zone commands", () => {
  it("adds a HitZone from sprite size, undoes, and redoes", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const nodeId = editor.createSprite("Hero");
    const sprite = getSprite(editor.getScene().nodes[0]!)!;

    const componentId = editor.addHitZone(nodeId);
    const zone = getHitZone(editor.getScene().nodes[0]!);
    expect(zone?.id).toBe(componentId);
    expect(zone?.shape).toEqual({
      type: "rectangle",
      width: sprite.width,
      height: sprite.height,
    });

    editor.undo();
    expect(getHitZone(editor.getScene().nodes[0]!)).toBeUndefined();

    editor.redo();
    expect(getHitZone(editor.getScene().nodes[0]!)?.id).toBe(componentId);
  });

  it("rejects a second HitZone and Transform3D-only nodes", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const spriteId = editor.createSprite("Hero");
    editor.addHitZone(spriteId);
    expect(() => editor.addHitZone(spriteId)).toThrow(/already on node/);

    const threeId = editor.createNode("three.container");
    expect(() => editor.addHitZone(threeId)).toThrow(/Transform2D/);
  });

  it("patches HitZone with undo and omits identity defaults", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const nodeId = editor.createSprite("Hero");
    editor.addHitZone(nodeId);

    editor.setHitZone(nodeId, {
      enabled: false,
      offset: { x: 4, y: 6 },
      shape: { type: "circle", radius: 12 },
    });
    expect(getHitZone(editor.getScene().nodes[0]!)).toMatchObject({
      enabled: false,
      offset: { x: 4, y: 6 },
      shape: { type: "circle", radius: 12 },
    });

    editor.setHitZone(nodeId, {
      enabled: true,
      offset: { x: 0, y: 0 },
    });
    const compact = getHitZone(editor.getScene().nodes[0]!);
    expect(compact?.enabled).toBeUndefined();
    expect(compact?.offset).toBeUndefined();

    editor.undo();
    expect(getHitZone(editor.getScene().nodes[0]!)?.enabled).toBe(false);
  });

  it("removes HitZone with undo restoring order", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const nodeId = editor.createSprite("Hero");
    const zoneId = editor.addHitZone(nodeId);
    const before = editor.getScene().nodes[0]!.components.map((c) => c.id);

    editor.removeComponent(nodeId, zoneId);
    expect(getHitZone(editor.getScene().nodes[0]!)).toBeUndefined();

    editor.undo();
    expect(editor.getScene().nodes[0]!.components.map((c) => c.id)).toEqual(
      before,
    );
  });
});
