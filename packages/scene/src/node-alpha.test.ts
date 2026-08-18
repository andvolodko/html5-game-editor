import { describe, expect, it } from "vitest";
import { IDENTITY_NODE_ALPHA } from "./defaults.js";
import { createSpriteNode } from "./index.js";
import {
  copyNodeAlpha,
  getNodeAlpha,
  setNodeAlphaField,
} from "./node-alpha.js";

describe("node alpha", () => {
  it("treats omitted alpha as fully opaque", () => {
    const node = createSpriteNode("Hero", { x: 0, y: 0 });
    expect(getNodeAlpha(node)).toBe(IDENTITY_NODE_ALPHA);
    expect(node.alpha).toBeUndefined();
  });

  it("omits the field when setting identity and stores other values", () => {
    const node = createSpriteNode("Hero", { x: 0, y: 0 });
    setNodeAlphaField(node, 0.5);
    expect(node.alpha).toBe(0.5);
    expect(getNodeAlpha(node)).toBe(0.5);
    setNodeAlphaField(node, IDENTITY_NODE_ALPHA);
    expect(node.alpha).toBeUndefined();
    expect(getNodeAlpha(node)).toBe(IDENTITY_NODE_ALPHA);
  });

  it("clamps values to 0–1", () => {
    const node = createSpriteNode("Hero", { x: 0, y: 0 });
    setNodeAlphaField(node, -0.25);
    expect(node.alpha).toBe(0);
    setNodeAlphaField(node, 1.5);
    expect(node.alpha).toBeUndefined();
    expect(getNodeAlpha(node)).toBe(IDENTITY_NODE_ALPHA);
  });

  it("copies an explicit alpha", () => {
    const source = createSpriteNode("Hero", { x: 0, y: 0 });
    source.alpha = 0.25;
    const target = createSpriteNode("Copy", { x: 0, y: 0 });
    copyNodeAlpha(source, target);
    expect(target.alpha).toBe(0.25);
  });
});
