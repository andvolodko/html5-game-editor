import { describe, expect, it } from "vitest";
import {
  createEmptyScene,
  DEFAULT_SPRITE_SIZE,
  DEFAULT_VISUAL_ANCHOR,
  findNodeById,
  getSprite,
  getTransform2D,
  getTransform3D,
  IDENTITY_POSITION_2D,
  IDENTITY_POSITION_3D,
  IDENTITY_ROTATION_2D,
  IDENTITY_ROTATION_3D,
  IDENTITY_SCALE_2D,
  IDENTITY_SCALE_3D,
} from "@game-editor/scene";
import {
  CreateModel3DCommand,
  CreateSpriteCommand,
  Editor,
} from "../index.js";

describe("ResetNodeTransformCommand", () => {
  it("resets Transform2D to identity and undoes", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const create = new CreateSpriteCommand(
      editor.document,
      editor.selection,
      "Sprite",
      { x: 40, y: 80 },
    );
    editor.execute(create);
    editor.setTransform2D(create.createdNodeId, {
      rotation: 45,
      scale: { x: 2, y: 0.5 },
    });

    expect(editor.resetNodeTransform(create.createdNodeId)).toBe(true);
    const transform = getTransform2D(
      findNodeById(editor.getScene(), create.createdNodeId)!,
    );
    expect(transform?.position).toEqual(IDENTITY_POSITION_2D);
    expect(transform?.rotation).toBe(IDENTITY_ROTATION_2D);
    expect(transform?.scale).toEqual(IDENTITY_SCALE_2D);

    editor.undo();
    const undone = getTransform2D(
      findNodeById(editor.getScene(), create.createdNodeId)!,
    );
    expect(undone?.position).toEqual({ x: 40, y: 80 });
    expect(undone?.rotation).toBe(45);
    expect(undone?.scale).toEqual({ x: 2, y: 0.5 });
  });

  it("resets Transform2D skew to identity and undoes", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const create = new CreateSpriteCommand(
      editor.document,
      editor.selection,
      "Sprite",
      { x: 40, y: 80 },
    );
    editor.execute(create);
    editor.setTransform2D(create.createdNodeId, {
      skew: { x: 12, y: -8 },
    });

    expect(editor.resetNodeTransform(create.createdNodeId)).toBe(true);
    const transform = getTransform2D(
      findNodeById(editor.getScene(), create.createdNodeId)!,
    );
    expect(transform?.skew).toBeUndefined();

    editor.undo();
    expect(
      getTransform2D(findNodeById(editor.getScene(), create.createdNodeId)!)
        ?.skew,
    ).toEqual({ x: 12, y: -8 });
  });

  it("resets flipped scale and visual anchor to defaults and undoes", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const create = new CreateSpriteCommand(
      editor.document,
      editor.selection,
      "Sprite",
      { x: 40, y: 80 },
    );
    editor.execute(create);
    editor.setTransform2D(create.createdNodeId, {
      scale: { x: -2, y: 3 },
    });
    editor.setVisualComponent(create.createdNodeId, {
      anchor: { x: 0, y: 1 },
    });

    expect(editor.resetNodeTransform(create.createdNodeId)).toBe(true);
    const node = findNodeById(editor.getScene(), create.createdNodeId)!;
    expect(getTransform2D(node)?.scale).toEqual(IDENTITY_SCALE_2D);
    expect(getSprite(node)?.anchor).toEqual(DEFAULT_VISUAL_ANCHOR);

    editor.undo();
    const undone = findNodeById(editor.getScene(), create.createdNodeId)!;
    expect(getTransform2D(undone)?.scale).toEqual({ x: -2, y: 3 });
    expect(getSprite(undone)?.anchor).toEqual({ x: 0, y: 1 });
  });

  it("resets sprite width and height to factory default and undoes", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const create = new CreateSpriteCommand(
      editor.document,
      editor.selection,
      "Sprite",
      { x: 10, y: 20 },
    );
    editor.execute(create);
    editor.setSpriteSize(create.createdNodeId, { width: 120, height: 80 });

    expect(editor.resetNodeTransform(create.createdNodeId)).toBe(true);
    const sprite = getSprite(
      findNodeById(editor.getScene(), create.createdNodeId)!,
    );
    expect(sprite?.width).toBe(DEFAULT_SPRITE_SIZE);
    expect(sprite?.height).toBe(DEFAULT_SPRITE_SIZE);

    editor.undo();
    const undone = getSprite(
      findNodeById(editor.getScene(), create.createdNodeId)!,
    );
    expect(undone?.width).toBe(120);
    expect(undone?.height).toBe(80);
  });

  it("resets Transform3D to identity and undoes", () => {
    const editor = new Editor({
      scene: createEmptyScene("3D", { renderer: "three" }),
    });
    const create = new CreateModel3DCommand(
      editor.document,
      editor.selection,
      {
        name: "Monster",
        position: { x: 1, y: 2 },
        assetId: "asset_glb",
      },
    );
    editor.execute(create);
    editor.setTransform3D(create.createdNodeId, {
      rotation: { x: 0.1, y: 0.2, z: 0.3 },
      scale: { x: 2, y: 2, z: 2 },
    });

    expect(editor.resetNodeTransform(create.createdNodeId)).toBe(true);
    const transform = getTransform3D(
      findNodeById(editor.getScene(), create.createdNodeId)!,
    );
    expect(transform?.position).toEqual(IDENTITY_POSITION_3D);
    expect(transform?.rotation).toEqual(IDENTITY_ROTATION_3D);
    expect(transform?.scale).toEqual(IDENTITY_SCALE_3D);

    editor.undo();
    const undone = getTransform3D(
      findNodeById(editor.getScene(), create.createdNodeId)!,
    );
    expect(undone?.position).toEqual({ x: 1, y: 0, z: 2 });
    expect(undone?.rotation).toEqual({ x: 0.1, y: 0.2, z: 0.3 });
    expect(undone?.scale).toEqual({ x: 2, y: 2, z: 2 });
  });

  it("uses the primary selection when no node id is passed", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const create = new CreateSpriteCommand(
      editor.document,
      editor.selection,
      "Sprite",
      { x: 10, y: 20 },
    );
    editor.execute(create);

    expect(editor.resetNodeTransform()).toBe(true);
    expect(
      getTransform2D(findNodeById(editor.getScene(), create.createdNodeId)!)
        ?.position,
    ).toEqual(IDENTITY_POSITION_2D);
  });

  it("returns false when nothing is selected", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    expect(editor.resetNodeTransform()).toBe(false);
  });
});
