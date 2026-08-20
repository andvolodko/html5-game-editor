import { describe, expect, it } from "vitest";
import { resolveInspectorNumberDraft } from "./format-inspector-number";

describe("inspector blur session flush", () => {
  it("commits the typed draft to the bound node, not a later selection", () => {
    const bound = { value: 0.25, integer: undefined };
    expect(resolveInspectorNumberDraft("1", bound.value, bound.integer)).toEqual({
      kind: "commit",
      value: 1,
    });
  });

  it("does not treat the newly selected node's value as the edit target", () => {
    const previousNode = { value: 0.25 };
    const newlySelected = { value: 1 };
    expect(resolveInspectorNumberDraft("1", previousNode.value)).toEqual({
      kind: "commit",
      value: 1,
    });
    expect(resolveInspectorNumberDraft("1", newlySelected.value)).toEqual({
      kind: "revert",
    });
  });
});
