import { describe, expect, it } from "vitest";
import { createSpriteNode } from "./index.js";
import {
  copyNodeVisible,
  getNodeVisible,
  setNodeVisibleField,
} from "./node-visibility.js";

describe("node visibility", () => {
  it("treats omitted visible as true", () => {
    const node = createSpriteNode("Hero", { x: 0, y: 0 });
    expect(getNodeVisible(node)).toBe(true);
    expect(node.visible).toBeUndefined();
  });

  it("omits the field when setting true and stores false when hidden", () => {
    const node = createSpriteNode("Hero", { x: 0, y: 0 });
    setNodeVisibleField(node, false);
    expect(node.visible).toBe(false);
    expect(getNodeVisible(node)).toBe(false);
    setNodeVisibleField(node, true);
    expect(node.visible).toBeUndefined();
    expect(getNodeVisible(node)).toBe(true);
  });

  it("copies an explicit visible flag", () => {
    const source = createSpriteNode("Hero", { x: 0, y: 0 });
    source.visible = false;
    const target = createSpriteNode("Copy", { x: 0, y: 0 });
    copyNodeVisible(source, target);
    expect(target.visible).toBe(false);
  });
});
