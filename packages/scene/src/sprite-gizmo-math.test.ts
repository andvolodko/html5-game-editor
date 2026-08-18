import { describe, expect, it } from "vitest";
import {
  gizmoHandleLocalPosition,
  gizmoLocalFromAnchor,
  visualCenterFromAnchor,
  anchorFromGizmoLocal,
  positionDeltaForAnchorChange,
  normalizeRotationDegrees,
  rotationFromHandleDrag,
  sizeFromHandleDrag,
  sizeHandleCursor,
  scaleFromAxisDrag,
  spriteGizmoHitOutsets,
  SPRITE_GIZMO_HANDLE_HIT_EXTENT,
  SPRITE_GIZMO_MIN_SIZE,
  SPRITE_GIZMO_MIN_SCALE,
  SPRITE_GIZMO_ROTATE_HIT_EXTENT,
  SPRITE_GIZMO_ROTATE_OFFSET,
} from "./sprite-gizmo-math.js";

describe("sprite-gizmo-math", () => {
  it("resizes from edge and corner handles around center", () => {
    expect(sizeFromHandleDrag("e", 50, 0, 64, 32)).toEqual({ width: 100, height: 32 });
    expect(sizeFromHandleDrag("w", -40, 0, 64, 32)).toEqual({ width: 80, height: 32 });
    expect(sizeFromHandleDrag("se", 30, 20, 64, 32)).toEqual({ width: 60, height: 40 });
    expect(sizeFromHandleDrag("nw", -30, -20, 64, 32)).toEqual({ width: 60, height: 40 });
  });

  it("resizes around a non-center anchor (Pixi pivot stays fixed)", () => {
    const left = { x: 0, y: 0.5 };
    // Left-anchored: dragging the right edge to x=120 grows only to the right.
    expect(sizeFromHandleDrag("e", 120, 0, 100, 40, { anchor: left })).toEqual({
      width: 120,
      height: 40,
    });
    // Left edge handle is degenerate at ax=0 — clamp to minimum.
    expect(sizeFromHandleDrag("w", -10, 0, 100, 40, { anchor: left }).width).toBe(
      SPRITE_GIZMO_MIN_SIZE,
    );

    const bottomRight = { x: 1, y: 1 };
    expect(
      sizeFromHandleDrag("nw", -80, -60, 100, 40, { anchor: bottomRight }),
    ).toEqual({ width: 80, height: 60 });
  });

  it("clamps to a minimum size", () => {
    expect(sizeFromHandleDrag("e", 1, 0, 64, 32).width).toBe(SPRITE_GIZMO_MIN_SIZE);
    expect(sizeFromHandleDrag("se", 1, 1, 64, 32)).toEqual({
      width: SPRITE_GIZMO_MIN_SIZE,
      height: SPRITE_GIZMO_MIN_SIZE,
    });
  });

  it("rotates size-handle cursors with the node", () => {
    expect(sizeHandleCursor("e")).toBe("ew-resize");
    expect(sizeHandleCursor("e", 90)).toBe("ns-resize");
    expect(sizeHandleCursor("se", 90)).toBe("nesw-resize");
    expect(sizeHandleCursor("nw", 90)).toBe("nesw-resize");
    expect(sizeHandleCursor("e", 0, { x: true, y: false })).toBe("ew-resize");
  });

  it("supports uniform corner scaling", () => {
    const result = sizeFromHandleDrag("se", 64, 16, 64, 32, { uniform: true });
    expect(result.width).toBe(128);
    expect(result.height).toBe(64);
  });

  it("supports uniform corner scaling around a non-center anchor", () => {
    const result = sizeFromHandleDrag("se", 100, 20, 100, 40, {
      uniform: true,
      anchor: { x: 0, y: 0.5 },
    });
    // startRight=100, startBottom=20 → scaleX=1, scaleY=1 → unchanged? 
    // localY=20, startBottom=(1-0.5)*40=20 → scaleY=1
    // localX=100, startRight=100 → scaleX=1
    expect(result).toEqual({ width: 100, height: 40 });

    const grown = sizeFromHandleDrag("se", 200, 20, 100, 40, {
      uniform: true,
      anchor: { x: 0, y: 0.5 },
    });
    // scaleX=2, scaleY=1 → scale=2
    expect(grown).toEqual({ width: 200, height: 80 });
  });

  it("computes rotation deltas and normalizes degrees", () => {
    // Start at top (0, -1), move to right (1, 0) → +90°
    expect(rotationFromHandleDrag(1, 0, 0, -1, 0)).toBeCloseTo(90, 5);
    expect(normalizeRotationDegrees(270)).toBe(-90);
    expect(normalizeRotationDegrees(-270)).toBe(90);
  });

  it("places the six size handles, rotation stem, and flip tools", () => {
    expect(gizmoHandleLocalPosition("nw", 100, 40)).toEqual({ x: -50, y: -20 });
    expect(gizmoHandleLocalPosition("e", 100, 40)).toEqual({ x: 50, y: 0 });
    expect(gizmoHandleLocalPosition("scaleX", 100, 40)).toEqual({ x: 50, y: 0 });
    expect(gizmoHandleLocalPosition("scaleY", 100, 40)).toEqual({ x: 0, y: 20 });
    expect(gizmoHandleLocalPosition("rotate", 100, 40, 28)).toEqual({ x: 0, y: -48 });
    expect(gizmoHandleLocalPosition("flipH", 100, 40)).toEqual({ x: -40, y: 44 });
    expect(gizmoHandleLocalPosition("flipV", 100, 40)).toEqual({ x: -12, y: 44 });
  });

  it("scales from parent-space axis distances and clamps magnitude", () => {
    expect(
      scaleFromAxisDrag("scaleX", 100, 50, { x: 1, y: 1 }),
    ).toEqual({ x: 2, y: 1 });
    expect(
      scaleFromAxisDrag("scaleY", 80, 40, { x: 1, y: 2 }),
    ).toEqual({ x: 1, y: 4 });
    expect(
      scaleFromAxisDrag("scaleX", 100, 50, { x: -1, y: 1 }),
    ).toEqual({ x: -2, y: 1 });
    expect(
      scaleFromAxisDrag("scaleX", 1, 50, { x: 1, y: 1 }).x,
    ).toBe(SPRITE_GIZMO_MIN_SCALE);
    expect(
      scaleFromAxisDrag("scaleX", 100, 50, { x: 1, y: 1 }, { uniform: true }),
    ).toEqual({ x: 2, y: 2 });
  });

  it("maps anchor UV ↔ gizmo local and compensates position", () => {
    expect(gizmoLocalFromAnchor({ x: 0.5, y: 0.5 }, 100, 40)).toEqual({
      x: 0,
      y: 0,
    });
    expect(gizmoLocalFromAnchor({ x: 0, y: 0 }, 100, 40)).toEqual({
      x: -50,
      y: -20,
    });
    expect(visualCenterFromAnchor({ x: 0.5, y: 0.5 }, 100, 40)).toEqual({
      x: 0,
      y: 0,
    });
    expect(visualCenterFromAnchor({ x: 0, y: 0.5 }, 100, 40)).toEqual({
      x: 50,
      y: 0,
    });
    expect(anchorFromGizmoLocal(-50, -20, 100, 40)).toEqual({ x: 0, y: 0 });
    expect(anchorFromGizmoLocal(0, 0, 100, 40)).toEqual({ x: 0.5, y: 0.5 });

    const delta = positionDeltaForAnchorChange(
      { x: 0.5, y: 0.5 },
      { x: 0, y: 0.5 },
      100,
      40,
      0,
      { x: 1, y: 1 },
    );
    expect(delta.x).toBeCloseTo(-50, 5);
    expect(delta.y).toBeCloseTo(0, 5);
  });

  it("reports hit outsets that cover rotate and flip tools", () => {
    const outset = spriteGizmoHitOutsets();
    expect(outset.top).toBeGreaterThanOrEqual(SPRITE_GIZMO_ROTATE_OFFSET + SPRITE_GIZMO_ROTATE_HIT_EXTENT);
    expect(outset.left).toBe(SPRITE_GIZMO_HANDLE_HIT_EXTENT);
    expect(outset.right).toBe(SPRITE_GIZMO_HANDLE_HIT_EXTENT);
    expect(outset.bottom).toBeGreaterThanOrEqual(SPRITE_GIZMO_HANDLE_HIT_EXTENT);
  });

  it("scales hit outsets with inverse camera zoom for screen-constant chrome", () => {
    const zoomedIn = spriteGizmoHitOutsets(2);
    expect(zoomedIn.top).toBeCloseTo(
      (SPRITE_GIZMO_ROTATE_OFFSET + SPRITE_GIZMO_ROTATE_HIT_EXTENT) / 2,
      5,
    );
    const zoomedOut = spriteGizmoHitOutsets(0.5);
    expect(zoomedOut.left).toBeCloseTo(SPRITE_GIZMO_HANDLE_HIT_EXTENT * 2, 5);
  });

  it("scales hit outsets with inverse node scale so handles stay hittable", () => {
    const scaledUp = spriteGizmoHitOutsets(1, { x: 3, y: 2 });
    expect(scaledUp.left).toBeCloseTo(SPRITE_GIZMO_HANDLE_HIT_EXTENT / 3, 5);
    expect(scaledUp.top).toBeCloseTo(
      (SPRITE_GIZMO_ROTATE_OFFSET + SPRITE_GIZMO_ROTATE_HIT_EXTENT) / 2,
      5,
    );
    const scaledDown = spriteGizmoHitOutsets(2, { x: 0.5, y: 0.5 });
    expect(scaledDown.left).toBeCloseTo(SPRITE_GIZMO_HANDLE_HIT_EXTENT * 1, 5);
  });
});