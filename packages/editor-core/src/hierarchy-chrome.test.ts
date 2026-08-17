import { describe, expect, it } from "vitest";
import {
  HIERARCHY_CHROME_ATTR,
  isHierarchyChromeEventTarget,
} from "./hierarchy-chrome.js";

describe("isHierarchyChromeEventTarget", () => {
  it("returns false for null and objects without closest", () => {
    expect(isHierarchyChromeEventTarget(null)).toBe(false);
    expect(isHierarchyChromeEventTarget({})).toBe(false);
  });

  it("detects eye/lock chrome without treating the row as a match", () => {
    const row = {
      closest(selector: string) {
        return selector === "[data-node-id]" ? this : null;
      },
    };
    const chrome = {
      closest(selector: string) {
        return selector === `[${HIERARCHY_CHROME_ATTR}]` ? this : null;
      },
    };
    expect(isHierarchyChromeEventTarget(row)).toBe(false);
    expect(isHierarchyChromeEventTarget(chrome)).toBe(true);
  });
});
