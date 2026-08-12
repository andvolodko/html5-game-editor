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
});
