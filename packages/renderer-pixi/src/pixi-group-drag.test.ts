import { describe, expect, it } from "vitest";
import { Matrix } from "pixi.js";
import {
  collectGroupDragMemberIds,
  localAfterWorldDelta,
} from "./pixi-group-drag.js";

describe("collectGroupDragMemberIds", () => {
  const tree = {
    parent: undefined as string | undefined,
    child: "parent",
    a: undefined as string | undefined,
    b: undefined as string | undefined,
  };

  const getParentId = (id: string): string | undefined =>
    tree[id as keyof typeof tree];

  it("uses only the grabbed node when it is not already selected", () => {
    expect(
      collectGroupDragMemberIds({
        grabbedId: "a",
        selectedIds: ["b"],
        getParentId,
        canMove: () => true,
      }),
    ).toEqual(["a"]);
  });

  it("includes sibling selection when the grabbed node is selected", () => {
    expect(
      collectGroupDragMemberIds({
        grabbedId: "a",
        selectedIds: ["a", "b"],
        getParentId,
        canMove: () => true,
      }),
    ).toEqual(["a", "b"]);
  });

  it("drops a selected child when an ancestor is also selected and movable", () => {
    expect(
      collectGroupDragMemberIds({
        grabbedId: "child",
        selectedIds: ["parent", "child"],
        getParentId,
        canMove: () => true,
      }),
    ).toEqual(["parent"]);
  });

  it("keeps the child when the selected ancestor cannot move", () => {
    expect(
      collectGroupDragMemberIds({
        grabbedId: "child",
        selectedIds: ["parent", "child"],
        getParentId,
        canMove: (id) => id !== "parent",
      }),
    ).toEqual(["child"]);
  });
});

describe("localAfterWorldDelta", () => {
  it("adds a world delta under an identity parent", () => {
    const parentToWorld = new Matrix();
    const startLocal = { x: 10, y: 20 };
    expect(
      localAfterWorldDelta(
        {
          parentToWorld,
          startLocal,
          startWorld: { ...startLocal },
        },
        { x: 4, y: 2 },
      ),
    ).toEqual({ x: 14, y: 22 });
  });
});
