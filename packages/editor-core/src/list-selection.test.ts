import { describe, expect, it } from "vitest";
import {
  applyListSelection,
  idsBetweenInclusive,
  isToggleSelectionKey,
} from "./list-selection.js";

const ORDER = ["a", "b", "c", "d", "e"] as const;

describe("idsBetweenInclusive", () => {
  it("returns the inclusive span in display order", () => {
    expect(idsBetweenInclusive(ORDER, "b", "d")).toEqual(["b", "c", "d"]);
    expect(idsBetweenInclusive(ORDER, "d", "b")).toEqual(["b", "c", "d"]);
  });

  it("falls back when an endpoint is missing", () => {
    expect(idsBetweenInclusive(ORDER, "missing", "c")).toEqual(["c"]);
    expect(idsBetweenInclusive(ORDER, "c", "missing")).toEqual(["c"]);
  });
});

describe("applyListSelection", () => {
  it("replaces on a plain click", () => {
    expect(
      applyListSelection(ORDER, ["a"], "c", { shiftKey: false, toggleKey: false }, "a"),
    ).toEqual({ selected: ["c"], anchor: "c" });
  });

  it("toggles with Ctrl/Cmd", () => {
    expect(
      applyListSelection(ORDER, ["a"], "c", { shiftKey: false, toggleKey: true }, "a"),
    ).toEqual({ selected: ["a", "c"], anchor: "c" });
    expect(
      applyListSelection(ORDER, ["a", "c"], "a", { shiftKey: false, toggleKey: true }, "c"),
    ).toEqual({ selected: ["c"], anchor: "a" });
  });

  it("selects the visible range with Shift", () => {
    expect(
      applyListSelection(ORDER, ["b"], "d", { shiftKey: true, toggleKey: false }, "b"),
    ).toEqual({ selected: ["b", "c", "d"], anchor: "b" });
  });

  it("unions the range with Ctrl+Shift", () => {
    expect(
      applyListSelection(
        ORDER,
        ["a"],
        "d",
        { shiftKey: true, toggleKey: true },
        "c",
      ),
    ).toEqual({ selected: ["a", "c", "d"], anchor: "c" });
  });

  it("uses the clicked id as both ends when there is no usable anchor", () => {
    expect(
      applyListSelection(ORDER, [], "c", { shiftKey: true, toggleKey: false }, undefined),
    ).toEqual({ selected: ["c"], anchor: "c" });
  });
});

describe("isToggleSelectionKey", () => {
  it("treats Ctrl and Cmd as toggle", () => {
    expect(isToggleSelectionKey({ ctrlKey: true, metaKey: false })).toBe(true);
    expect(isToggleSelectionKey({ ctrlKey: false, metaKey: true })).toBe(true);
    expect(isToggleSelectionKey({ ctrlKey: false, metaKey: false })).toBe(false);
  });
});
