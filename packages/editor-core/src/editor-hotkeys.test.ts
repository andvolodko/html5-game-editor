import { describe, expect, it } from "vitest";
import { isAssetsPanelKeyTarget } from "./editor-hotkeys.js";

describe("isAssetsPanelKeyTarget", () => {
  it("returns true when closest finds the assets panel marker", () => {
    const inside = {
      closest(this: object, selector: string) {
        if (this !== inside) {
          throw new TypeError("Illegal invocation");
        }
        return selector === '[data-editor-panel="assets"]' ? {} : null;
      },
    };
    expect(isAssetsPanelKeyTarget(inside)).toBe(true);
  });

  it("returns false outside the assets panel", () => {
    const outside = {
      closest(this: object) {
        if (this !== outside) {
          throw new TypeError("Illegal invocation");
        }
        return null;
      },
    };
    expect(isAssetsPanelKeyTarget(outside)).toBe(false);
    expect(isAssetsPanelKeyTarget(null)).toBe(false);
  });
});
