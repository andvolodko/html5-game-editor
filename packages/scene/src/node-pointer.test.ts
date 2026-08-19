import { describe, expect, it } from "vitest";
import { createSpriteNode } from "./index.js";
import {
  copyNodePointer,
  DEFAULT_NODE_POINTER_CHILDREN,
  DEFAULT_NODE_POINTER_EVENT_MODE,
  getNodeCursor,
  getNodePointerChildren,
  getNodePointerEventMode,
  setNodeCursorField,
  setNodePointerChildrenField,
  setNodePointerEventModeField,
} from "./node-pointer.js";

describe("node pointer", () => {
  it("treats omitted pointer fields as playback defaults", () => {
    const node = createSpriteNode("Hero", { x: 0, y: 0 });
    expect(getNodePointerEventMode(node)).toBe(DEFAULT_NODE_POINTER_EVENT_MODE);
    expect(getNodeCursor(node)).toBe("");
    expect(getNodePointerChildren(node)).toBe(DEFAULT_NODE_POINTER_CHILDREN);
    expect(node.pointerEventMode).toBeUndefined();
    expect(node.cursor).toBeUndefined();
    expect(node.pointerChildren).toBeUndefined();
  });

  it("omits default event mode and stores other modes", () => {
    const node = createSpriteNode("Hero", { x: 0, y: 0 });
    setNodePointerEventModeField(node, "none");
    expect(node.pointerEventMode).toBe("none");
    setNodePointerEventModeField(node, DEFAULT_NODE_POINTER_EVENT_MODE);
    expect(node.pointerEventMode).toBeUndefined();
  });

  it("omits empty cursor and stores a CSS cursor", () => {
    const node = createSpriteNode("Hero", { x: 0, y: 0 });
    setNodeCursorField(node, "pointer");
    expect(node.cursor).toBe("pointer");
    setNodeCursorField(node, "  ");
    expect(node.cursor).toBeUndefined();
  });

  it("omits pointerChildren when true and stores false", () => {
    const node = createSpriteNode("Hero", { x: 0, y: 0 });
    setNodePointerChildrenField(node, false);
    expect(node.pointerChildren).toBe(false);
    setNodePointerChildrenField(node, true);
    expect(node.pointerChildren).toBeUndefined();
  });

  it("copies explicit pointer fields", () => {
    const source = createSpriteNode("Hero", { x: 0, y: 0 });
    source.pointerEventMode = "passive";
    source.cursor = "pointer";
    source.pointerChildren = false;
    const target = createSpriteNode("Copy", { x: 0, y: 0 });
    copyNodePointer(source, target);
    expect(target.pointerEventMode).toBe("passive");
    expect(target.cursor).toBe("pointer");
    expect(target.pointerChildren).toBe(false);
  });
});
