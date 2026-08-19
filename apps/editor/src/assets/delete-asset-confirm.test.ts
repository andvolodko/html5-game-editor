import { describe, expect, it } from "vitest";
import { formatDeleteAssetConfirm } from "./delete-asset-confirm";

describe("formatDeleteAssetConfirm", () => {
  it("names a single asset", () => {
    expect(formatDeleteAssetConfirm(["hero.png"])).toEqual({
      title: "Delete asset",
      description: "Delete \u201chero.png\u201d? This can be undone.",
      confirmLabel: "Delete",
    });
  });

  it("falls back when the name list is empty", () => {
    expect(formatDeleteAssetConfirm([])).toEqual({
      title: "Delete asset",
      description: "Delete \u201cthis asset\u201d? This can be undone.",
      confirmLabel: "Delete",
    });
  });

  it("counts multiple assets", () => {
    expect(formatDeleteAssetConfirm(["a.png", "b.png", "c.png"])).toEqual({
      title: "Delete assets",
      description: "Delete 3 assets? This can be undone.",
      confirmLabel: "Delete",
    });
  });
});
