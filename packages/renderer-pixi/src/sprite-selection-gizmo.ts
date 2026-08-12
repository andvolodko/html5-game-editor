import { Container, Graphics } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import {
  DEFAULT_SPRITE_SIZE,
  gizmoHandleLocalPosition,
  gizmoLocalFromAnchor,
  sizeHandleCursor,
  SPRITE_GIZMO_ANCHOR_HIT_EXTENT,
  SPRITE_GIZMO_HANDLE_HIT_EXTENT,
  SPRITE_GIZMO_ROTATE_HIT_EXTENT,
  SPRITE_GIZMO_ROTATE_OFFSET,
  SPRITE_GIZMO_FLIP_OFFSET,
  SPRITE_GIZMO_FLIP_GAP,
  SPRITE_GIZMO_FLIP_INSET,
  SPRITE_SIZE_HANDLES,
  type SpriteGizmoHandle,
  type SpriteSizeHandle,
  type Vec2,
} from "@game-editor/scene";
import {
  EDITOR_ACCENT_ACTIVE_COLOR,
  EDITOR_ACCENT_ACTIVE_FILL,
  EDITOR_ACCENT_COLOR,
  EDITOR_CHROME_FILL,
  EDITOR_SELECTION_STROKE_WIDTH,
  GIZMO_FRAME_STROKE_ALPHA,
  GIZMO_FRAME_STROKE_WIDTH,
  GIZMO_STEM_STROKE_ALPHA,
} from "./editor-chrome.js";
import { viewportChromeInvScale } from "./viewport-camera.js";

const HANDLE_SIZE = 10;
const ROTATE_RADIUS = 6;
const TOOL_SIZE = 20;

export interface SpriteGizmoLayoutState {
  anchor: Vec2;
  flipX: boolean;
  flipY: boolean;
}

export interface SpriteGizmoPointerHandlers {
  onHandlePointerDown: (
    handle: SpriteGizmoHandle,
    event: FederatedPointerEvent,
  ) => void;
}

/**
 * Professional 2D selection chrome: bounds frame, size dots, rotation stem,
 * draggable anchor pivot, and flip H/V tools.
 * Lives in local sprite space (center origin).
 */
export class SpriteSelectionGizmo {
  readonly root = new Container();
  private readonly frame = new Graphics();
  private readonly stem = new Graphics();
  private readonly handles = new Map<SpriteGizmoHandle, Graphics>();
  private width = DEFAULT_SPRITE_SIZE;
  private height = DEFAULT_SPRITE_SIZE;
  private anchor: Vec2 = { x: 0.5, y: 0.5 };
  private flipX = false;
  private flipY = false;

  constructor(private readonly handlers: SpriteGizmoPointerHandlers) {
    // Passive root: only handles are hit targets (avoids competing with
    // sprite drag and keeps oversized handle pads reliable).
    this.root.eventMode = "passive";
    this.root.interactiveChildren = true;
    this.root.sortableChildren = true;
    this.frame.eventMode = "none";
    this.stem.eventMode = "none";
    this.frame.zIndex = 0;
    this.stem.zIndex = 1;
    this.root.addChild(this.frame);
    this.root.addChild(this.stem);

    for (const handle of SPRITE_SIZE_HANDLES) {
      this.createSizeHandle(handle);
    }
    this.createRotateHandle();
    this.createAnchorHandle();
    this.createFlipHandle("flipH");
    this.createFlipHandle("flipV");
  }

  layout(
    width: number,
    height: number,
    state?: SpriteGizmoLayoutState,
    cameraScale = 1,
  ): void {
    this.width = width;
    this.height = height;
    if (state) {
      this.anchor = { ...state.anchor };
      this.flipX = state.flipX;
      this.flipY = state.flipY;
    }
    const inv = viewportChromeInvScale(cameraScale);
    const rotateOffset = SPRITE_GIZMO_ROTATE_OFFSET * inv;
    const flipOffset = SPRITE_GIZMO_FLIP_OFFSET * inv;
    const flipGap = SPRITE_GIZMO_FLIP_GAP * inv;
    const flipInset = SPRITE_GIZMO_FLIP_INSET * inv;

    this.drawFrame(inv);
    this.drawStem(inv, rotateOffset);
    for (const handle of SPRITE_SIZE_HANDLES) {
      const gfx = this.handles.get(handle);
      const pos = gizmoHandleLocalPosition(
        handle,
        width,
        height,
        rotateOffset,
        flipOffset,
        flipGap,
        flipInset,
      );
      if (gfx) {
        gfx.position.set(pos.x, pos.y);
        gfx.scale.set(inv);
      }
    }
    const rotate = this.handles.get("rotate");
    const rotatePos = gizmoHandleLocalPosition(
      "rotate",
      width,
      height,
      rotateOffset,
      flipOffset,
      flipGap,
      flipInset,
    );
    if (rotate) {
      rotate.position.set(rotatePos.x, rotatePos.y);
      rotate.scale.set(inv);
    }

    const anchorGfx = this.handles.get("anchor");
    if (anchorGfx) {
      const pos = gizmoLocalFromAnchor(this.anchor, width, height);
      anchorGfx.position.set(pos.x, pos.y);
      anchorGfx.scale.set(inv);
    }

    this.redrawFlipHandle("flipH", this.flipX);
    this.redrawFlipHandle("flipV", this.flipY);
    for (const handle of ["flipH", "flipV"] as const) {
      const gfx = this.handles.get(handle);
      const pos = gizmoHandleLocalPosition(
        handle,
        width,
        height,
        rotateOffset,
        flipOffset,
        flipGap,
        flipInset,
      );
      if (gfx) {
        gfx.position.set(pos.x, pos.y);
        gfx.scale.set(inv);
      }
    }
  }

  setVisible(visible: boolean): void {
    this.root.visible = visible;
  }

  /** Live-update the anchor handle during a drag preview. */
  setAnchorPreview(anchor: Vec2): void {
    this.anchor = { ...anchor };
    const gfx = this.handles.get("anchor");
    if (!gfx) {
      return;
    }
    const pos = gizmoLocalFromAnchor(anchor, this.width, this.height);
    gfx.position.set(pos.x, pos.y);
  }

  destroy(): void {
    this.root.destroy({ children: true });
    this.handles.clear();
  }

  private drawFrame(invScale: number): void {
    const pad = 0.5 * invScale;
    this.frame.clear();
    this.frame.rect(
      -this.width / 2 - pad,
      -this.height / 2 - pad,
      this.width + pad * 2,
      this.height + pad * 2,
    );
    this.frame.stroke({
      width: GIZMO_FRAME_STROKE_WIDTH * invScale,
      color: EDITOR_ACCENT_COLOR,
      alpha: GIZMO_FRAME_STROKE_ALPHA,
    });
  }

  private drawStem(invScale: number, rotateOffset: number): void {
    const top = -this.height / 2;
    this.stem.clear();
    this.stem.moveTo(0, top);
    this.stem.lineTo(0, top - rotateOffset);
    this.stem.stroke({
      width: GIZMO_FRAME_STROKE_WIDTH * invScale,
      color: EDITOR_ACCENT_COLOR,
      alpha: GIZMO_STEM_STROKE_ALPHA,
    });
  }

  private createSizeHandle(handle: SpriteSizeHandle): void {
    const gfx = new Graphics();
    gfx.eventMode = "static";
    gfx.cursor = sizeHandleCursor(handle);
    gfx.zIndex = 2;
    const half = HANDLE_SIZE / 2;
    gfx.roundRect(-half, -half, HANDLE_SIZE, HANDLE_SIZE, 2);
    gfx.fill({ color: EDITOR_CHROME_FILL });
    gfx.stroke({ width: EDITOR_SELECTION_STROKE_WIDTH, color: EDITOR_ACCENT_COLOR });
    const extent = SPRITE_GIZMO_HANDLE_HIT_EXTENT;
    gfx.hitArea = {
      contains: (x: number, y: number) =>
        Math.abs(x) <= extent && Math.abs(y) <= extent,
    };
    gfx.on("pointerdown", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      this.handlers.onHandlePointerDown(handle, event);
    });
    this.handles.set(handle, gfx);
    this.root.addChild(gfx);
  }

  private createRotateHandle(): void {
    const gfx = new Graphics();
    gfx.eventMode = "static";
    gfx.cursor = "grab";
    gfx.zIndex = 3;
    gfx.circle(0, 0, ROTATE_RADIUS);
    gfx.fill({ color: EDITOR_CHROME_FILL });
    gfx.stroke({
      width: EDITOR_SELECTION_STROKE_WIDTH,
      color: EDITOR_ACCENT_COLOR,
    });
    gfx.hitArea = {
      contains: (x: number, y: number) =>
        x * x + y * y <=
        SPRITE_GIZMO_ROTATE_HIT_EXTENT * SPRITE_GIZMO_ROTATE_HIT_EXTENT,
    };
    gfx.on("pointerdown", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      this.handlers.onHandlePointerDown("rotate", event);
    });
    this.handles.set("rotate", gfx);
    this.root.addChild(gfx);
  }

  private createAnchorHandle(): void {
    const gfx = new Graphics();
    gfx.eventMode = "static";
    gfx.cursor = "move";
    gfx.zIndex = 4;
    // Crosshair + diamond pivot.
    gfx.moveTo(-7, 0);
    gfx.lineTo(7, 0);
    gfx.moveTo(0, -7);
    gfx.lineTo(0, 7);
    gfx.stroke({
      width: EDITOR_SELECTION_STROKE_WIDTH,
      color: EDITOR_ACCENT_COLOR,
      alpha: GIZMO_FRAME_STROKE_ALPHA,
    });
    gfx.moveTo(0, -5);
    gfx.lineTo(5, 0);
    gfx.lineTo(0, 5);
    gfx.lineTo(-5, 0);
    gfx.closePath();
    gfx.fill({ color: EDITOR_CHROME_FILL });
    gfx.stroke({
      width: EDITOR_SELECTION_STROKE_WIDTH,
      color: EDITOR_ACCENT_COLOR,
    });
    const extent = SPRITE_GIZMO_ANCHOR_HIT_EXTENT;
    gfx.hitArea = {
      contains: (x: number, y: number) =>
        Math.abs(x) <= extent && Math.abs(y) <= extent,
    };
    gfx.on("pointerdown", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      this.handlers.onHandlePointerDown("anchor", event);
    });
    this.handles.set("anchor", gfx);
    this.root.addChild(gfx);
  }

  private createFlipHandle(handle: "flipH" | "flipV"): void {
    const gfx = new Graphics();
    gfx.eventMode = "static";
    gfx.cursor = "pointer";
    gfx.zIndex = 3;
    gfx.hitArea = {
      contains: (x: number, y: number) => {
        const half = TOOL_SIZE / 2 + 4;
        return Math.abs(x) <= half && Math.abs(y) <= half;
      },
    };
    gfx.on("pointerdown", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      this.handlers.onHandlePointerDown(handle, event);
    });
    this.handles.set(handle, gfx);
    this.root.addChild(gfx);
  }

  private redrawFlipHandle(handle: "flipH" | "flipV", active: boolean): void {
    const gfx = this.handles.get(handle);
    if (!gfx) {
      return;
    }
    const half = TOOL_SIZE / 2;
    const stroke = active ? EDITOR_ACCENT_ACTIVE_COLOR : EDITOR_ACCENT_COLOR;
    const fill = active ? EDITOR_ACCENT_ACTIVE_FILL : EDITOR_CHROME_FILL;
    gfx.clear();
    gfx.roundRect(-half, -half, TOOL_SIZE, TOOL_SIZE, 3);
    gfx.fill({ color: fill });
    gfx.stroke({ width: EDITOR_SELECTION_STROKE_WIDTH, color: stroke });

    if (handle === "flipH") {
      // Left / right chevrons.
      gfx.moveTo(-5, -4);
      gfx.lineTo(-1, 0);
      gfx.lineTo(-5, 4);
      gfx.moveTo(5, -4);
      gfx.lineTo(1, 0);
      gfx.lineTo(5, 4);
      gfx.moveTo(-1, 0);
      gfx.lineTo(1, 0);
      gfx.stroke({ width: EDITOR_SELECTION_STROKE_WIDTH, color: stroke });
    } else {
      // Up / down chevrons.
      gfx.moveTo(-4, -5);
      gfx.lineTo(0, -1);
      gfx.lineTo(4, -5);
      gfx.moveTo(-4, 5);
      gfx.lineTo(0, 1);
      gfx.lineTo(4, 5);
      gfx.moveTo(0, -1);
      gfx.lineTo(0, 1);
      gfx.stroke({ width: EDITOR_SELECTION_STROKE_WIDTH, color: stroke });
    }
  }
}
