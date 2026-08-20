import { describe, expect, it } from "vitest";
import {
  createEmptyScene,
  createSpriteNode,
  getTransform2D,
  insertNodeInScene,
  BASE_NODE_STATE_ID,
} from "@game-editor/scene";
import { Editor } from "../editor.js";

function createEditorWithSprite() {
  const scene = createEmptyScene("Main");
  const sprite = createSpriteNode("Hero", { x: 100, y: 100 });
  insertNodeInScene(scene, sprite, undefined, 0);
  const editor = new Editor({ scene });
  return { editor, spriteId: sprite.id };
}

describe("node state editing", () => {
  it("Base transform edits mutate the Transform2D component", () => {
    const { editor, spriteId } = createEditorWithSprite();
    editor.setTransform2D(spriteId, { position: { x: 50, y: 75 } });
    const node = editor.document.getNode(spriteId)!;
    expect(getTransform2D(node)?.position).toEqual({ x: 50, y: 75 });
    expect(node.stateOverrides).toBeUndefined();
  });

  it("named-state transform edits write overrides only", () => {
    const { editor, spriteId } = createEditorWithSprite();
    const stateId = editor.addSceneState({ name: "Portrait" });
    editor.setActiveNodeState(stateId);
    editor.setTransform2D(spriteId, { position: { x: 100, y: 600 } });

    const node = editor.document.getNode(spriteId)!;
    expect(getTransform2D(node)?.position).toEqual({ x: 100, y: 100 });
    expect(node.stateOverrides?.[stateId]).toEqual({
      transform2D: { position: { y: 600 } },
    });
  });

  it("undo restores a state property edit", () => {
    const { editor, spriteId } = createEditorWithSprite();
    const stateId = editor.addSceneState({ name: "Portrait" });
    editor.setActiveNodeState(stateId);
    editor.setTransform2D(spriteId, { position: { x: 100, y: 600 } });
    expect(editor.document.getNode(spriteId)?.stateOverrides?.[stateId]).toBeDefined();

    editor.undo();
    expect(editor.document.getNode(spriteId)?.stateOverrides).toBeUndefined();

    editor.redo();
    expect(editor.document.getNode(spriteId)?.stateOverrides?.[stateId]).toEqual({
      transform2D: { position: { y: 600 } },
    });
  });

  it("reset removes one override channel", () => {
    const { editor, spriteId } = createEditorWithSprite();
    const stateId = editor.addSceneState({ name: "Portrait" });
    editor.setActiveNodeState(stateId);
    editor.setTransform2D(spriteId, {
      position: { x: 10, y: 600 },
      scale: { x: 0.8, y: 0.8 },
    });
    editor.resetNodeStateProperty(spriteId, "transform2D.position.x");
    expect(editor.document.getNode(spriteId)?.stateOverrides?.[stateId]).toEqual({
      transform2D: {
        position: { y: 600 },
        scale: { x: 0.8, y: 0.8 },
      },
    });
  });

  it("delete state strips overrides and returns session to Base", () => {
    const { editor, spriteId } = createEditorWithSprite();
    const stateId = editor.addSceneState({ name: "Portrait" });
    editor.setActiveNodeState(stateId);
    editor.setNodeAlpha(spriteId, 0.5);
    editor.deleteSceneState(stateId);
    expect(editor.getScene().states).toBeUndefined();
    expect(editor.document.getNode(spriteId)?.stateOverrides).toBeUndefined();
    expect(editor.nodeStates.getActiveStateId()).toBe(BASE_NODE_STATE_ID);
  });

  it("duplicate state copies overrides under a new id", () => {
    const { editor, spriteId } = createEditorWithSprite();
    const stateId = editor.addSceneState({ name: "Portrait" });
    editor.setActiveNodeState(stateId);
    editor.setNodeVisible(spriteId, false);
    const copyId = editor.duplicateSceneState(stateId)!;
    expect(copyId).not.toBe(stateId);
    expect(editor.document.getNode(spriteId)?.stateOverrides?.[copyId]).toEqual({
      visible: false,
    });
    expect(editor.getSceneStates().some((s) => s.id === copyId)).toBe(true);
  });

  it("ensurePortraitLandscapeStates is idempotent", () => {
    const { editor } = createEditorWithSprite();
    editor.ensurePortraitLandscapeStates();
    editor.ensurePortraitLandscapeStates();
    const names = editor.getSceneStates().map((s) => s.name);
    expect(names.filter((n) => n === "Portrait")).toHaveLength(1);
    expect(names.filter((n) => n === "Landscape")).toHaveLength(1);
  });
});
