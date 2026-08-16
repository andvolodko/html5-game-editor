import { describe, expect, it } from "vitest";
import { SelectionManager } from "./selection-manager.js";

describe("SelectionManager", () => {
  it("selects scene exclusively from nodes", () => {
    const selection = new SelectionManager();
    selection.setSelection(["node_a", "node_b"]);
    expect(selection.getSelection()).toEqual({
      kind: "nodes",
      nodeIds: ["node_a", "node_b"],
    });

    selection.selectScene();
    expect(selection.isSceneSelected()).toBe(true);
    expect(selection.getSelectedNodeIds()).toEqual([]);
    expect(selection.getPrimaryNodeId()).toBeUndefined();
    expect(selection.getSelection()).toEqual({ kind: "scene" });
  });

  it("clears scene selection when selecting nodes", () => {
    const selection = new SelectionManager();
    selection.selectScene();
    selection.setSelection(["node_a"]);
    expect(selection.isSceneSelected()).toBe(false);
    expect(selection.getSelection()).toEqual({
      kind: "nodes",
      nodeIds: ["node_a"],
    });
  });

  it("restores scene selection snapshots", () => {
    const selection = new SelectionManager();
    selection.selectScene();
    const snap = selection.getSelection();
    selection.setSelection(["node_a"]);
    selection.restore(snap);
    expect(selection.getSelection()).toEqual({ kind: "scene" });
  });

  it("toggle clears scene selection", () => {
    const selection = new SelectionManager();
    selection.selectScene();
    selection.toggleNode("node_a");
    expect(selection.isSceneSelected()).toBe(false);
    expect(selection.getSelectedNodeIds()).toEqual(["node_a"]);
  });

  it("applies Shift range and Ctrl toggle from a visible list", () => {
    const selection = new SelectionManager();
    const visible = ["a", "b", "c", "d"];
    selection.applyVisibleListClick(visible, "b", {
      shiftKey: false,
      toggleKey: false,
    });
    selection.applyVisibleListClick(visible, "d", {
      shiftKey: true,
      toggleKey: false,
    });
    expect(selection.getSelectedNodeIds()).toEqual(["b", "c", "d"]);

    selection.applyVisibleListClick(visible, "a", {
      shiftKey: false,
      toggleKey: true,
    });
    expect(selection.getSelectedNodeIds()).toEqual(["b", "c", "d", "a"]);
    expect(selection.getPrimaryNodeId()).toBe("a");
  });
});
