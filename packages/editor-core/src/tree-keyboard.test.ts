import { describe, expect, it } from "vitest";
import {
  HIERARCHY_SCENE_ROW_ID,
  TREE_KEYBOARD_PAGE_SIZE,
  adjacentVisibleId,
  resolveTreeKeyboardIntent,
} from "./tree-keyboard.js";

const VISIBLE = ["root", "a", "b", "c", "d"] as const;

function input(
  overrides: Partial<Parameters<typeof resolveTreeKeyboardIntent>[0]> & {
    key: string;
  },
): Parameters<typeof resolveTreeKeyboardIntent>[0] {
  return {
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    visibleIds: VISIBLE,
    currentId: "b",
    expanded: false,
    hasChildren: false,
    parentId: "root",
    firstChildId: undefined,
    ...overrides,
  };
}

describe("adjacentVisibleId", () => {
  it("moves within the list and clamps at the ends", () => {
    expect(adjacentVisibleId(VISIBLE, "b", 1)).toBe("c");
    expect(adjacentVisibleId(VISIBLE, "b", -1)).toBe("a");
    expect(adjacentVisibleId(VISIBLE, "root", -1)).toBe("root");
    expect(adjacentVisibleId(VISIBLE, "d", 1)).toBe("d");
  });

  it("starts at the first or last row when nothing is current", () => {
    expect(adjacentVisibleId(VISIBLE, undefined, 1)).toBe("root");
    expect(adjacentVisibleId(VISIBLE, undefined, -1)).toBe("d");
  });

  it("jumps a page and still clamps", () => {
    expect(adjacentVisibleId(VISIBLE, "a", TREE_KEYBOARD_PAGE_SIZE)).toBe("d");
    expect(adjacentVisibleId(VISIBLE, "c", -TREE_KEYBOARD_PAGE_SIZE)).toBe(
      "root",
    );
  });
});

describe("resolveTreeKeyboardIntent", () => {
  it("moves with arrows, Home, End, and Page keys", () => {
    expect(resolveTreeKeyboardIntent(input({ key: "ArrowDown" }))).toEqual({
      type: "select",
      id: "c",
    });
    expect(resolveTreeKeyboardIntent(input({ key: "ArrowUp" }))).toEqual({
      type: "select",
      id: "a",
    });
    expect(resolveTreeKeyboardIntent(input({ key: "Home" }))).toEqual({
      type: "select",
      id: "root",
    });
    expect(resolveTreeKeyboardIntent(input({ key: "End" }))).toEqual({
      type: "select",
      id: "d",
    });
    expect(resolveTreeKeyboardIntent(input({ key: "PageDown" }))).toEqual({
      type: "select",
      id: "d",
    });
    expect(resolveTreeKeyboardIntent(input({ key: "PageUp" }))).toEqual({
      type: "select",
      id: "root",
    });
  });

  it("expands a collapsed parent on Right and moves to the first child when expanded", () => {
    expect(
      resolveTreeKeyboardIntent(
        input({ key: "ArrowRight", hasChildren: true, expanded: false }),
      ),
    ).toEqual({ type: "expand" });
    expect(
      resolveTreeKeyboardIntent(
        input({
          key: "ArrowRight",
          hasChildren: true,
          expanded: true,
          firstChildId: "b-1",
        }),
      ),
    ).toEqual({ type: "select", id: "b-1" });
  });

  it("collapses an expanded parent on Left and otherwise selects the parent", () => {
    expect(
      resolveTreeKeyboardIntent(
        input({ key: "ArrowLeft", hasChildren: true, expanded: true }),
      ),
    ).toEqual({ type: "collapse" });
    expect(
      resolveTreeKeyboardIntent(
        input({ key: "ArrowLeft", hasChildren: true, expanded: false }),
      ),
    ).toEqual({ type: "select", id: "root" });
  });

  it("activates on Enter and toggles expand on Space when the row has children", () => {
    expect(resolveTreeKeyboardIntent(input({ key: "Enter" }))).toEqual({
      type: "activate",
    });
    expect(
      resolveTreeKeyboardIntent(input({ key: " ", hasChildren: true })),
    ).toEqual({ type: "toggle-expand" });
    expect(
      resolveTreeKeyboardIntent(input({ key: " ", hasChildren: false })),
    ).toBeUndefined();
  });

  it("selects all with Ctrl/Cmd+A and ignores other modifier chords", () => {
    expect(
      resolveTreeKeyboardIntent(input({ key: "a", code: "KeyA", ctrlKey: true })),
    ).toEqual({ type: "select-all" });
    expect(
      resolveTreeKeyboardIntent(
        input({ key: "c", code: "KeyC", ctrlKey: true }),
      ),
    ).toBeUndefined();
    expect(
      resolveTreeKeyboardIntent(input({ key: "ArrowDown", altKey: true })),
    ).toBeUndefined();
  });

  it("does not expand or collapse when expand is disabled", () => {
    expect(
      resolveTreeKeyboardIntent(
        input({
          key: "ArrowRight",
          hasChildren: true,
          expandEnabled: false,
        }),
      ),
    ).toBeUndefined();
    expect(
      resolveTreeKeyboardIntent(
        input({
          key: "ArrowLeft",
          hasChildren: true,
          expanded: true,
          expandEnabled: false,
        }),
      ),
    ).toEqual({ type: "select", id: "root" });
  });

  it("keeps the Hierarchy scene sentinel usable as a current id", () => {
    expect(
      adjacentVisibleId(
        [HIERARCHY_SCENE_ROW_ID, "node_a"],
        HIERARCHY_SCENE_ROW_ID,
        1,
      ),
    ).toBe("node_a");
  });
});
