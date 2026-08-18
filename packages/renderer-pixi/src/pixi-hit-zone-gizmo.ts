import { Container, Graphics } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import {
  gizmoHandleLocalPosition,
  sizeHandleCursor,
  SPRITE_GIZMO_HANDLE_HIT_EXTENT,
  SPRITE_SIZE_HANDLES,
  type SpriteSizeHandle,
  type Vec2,
} from "@game-editor/scene";
import {
  EDITOR_SELECTION_STROKE_WIDTH,
  HIT_ZONE_HANDLE_FILL,
  HIT_ZONE_STROKE_COLOR,
} from "./editor-chrome.js";
import { viewportChromeInvScale } from "./viewport-camera.js";

const HANDLE_SIZE = 10;
const VERTEX_RADIUS = 5;
const EDGE_RADIUS = 3.5;
const EDGE_HIT_EXTENT = 10;

export type HitZoneGizmoHandle =
  | { kind: "size"; handle: SpriteSizeHandle }
  | { kind: "vertex"; index: number }
  | { kind: "edge"; index: number };

export interface HitZoneGizmoPointerHandlers {
  onHandlePointerDown: (
    handle: HitZoneGizmoHandle,
    event: FederatedPointerEvent,
  ) => void;
}

export interface ShapeGizmoStyle {
  handleFill: number;
  stroke: number;
  labelPrefix: string;
}

const HIT_ZONE_GIZMO_STYLE: ShapeGizmoStyle = {
  handleFill: HIT_ZONE_HANDLE_FILL,
  stroke: HIT_ZONE_STROKE_COLOR,
  labelPrefix: "hitZoneGizmo",
};

/**
 * HitZone chrome: AABB size handles, or polygon vertices + edge-insert dots.
 */
export class HitZoneSelectionGizmo {
  readonly root = new Container();
  private readonly sizeHandles = new Map<SpriteSizeHandle, Graphics>();
  private readonly vertexHandles: Graphics[] = [];
  private readonly edgeHandles: Graphics[] = [];
  private readonly style: ShapeGizmoStyle;
  private width = HANDLE_SIZE;
  private height = HANDLE_SIZE;

  constructor(
    private readonly handlers: HitZoneGizmoPointerHandlers,
    style: ShapeGizmoStyle = HIT_ZONE_GIZMO_STYLE,
  ) {
    this.style = style;
    this.root.eventMode = "passive";
    this.root.interactiveChildren = true;
    this.root.sortableChildren = true;
    this.root.label = style.labelPrefix;
    for (const handle of SPRITE_SIZE_HANDLES) {
      this.createSizeHandle(handle);
    }
  }

  setVisible(visible: boolean): void {
    this.root.visible = visible;
  }

  layout(
    width: number,
    height: number,
    worldChromeScale: number | { x: number; y: number } = 1,
    rotationDeg = 0,
    flip?: { x: boolean; y: boolean },
  ): void {
    this.width = width;
    this.height = height;
    this.setPolygonHandlesVisible(false);
    this.setSizeHandlesVisible(true);
    const inv = chromeInvScale(worldChromeScale);
    for (const handle of SPRITE_SIZE_HANDLES) {
      const gfx = this.sizeHandles.get(handle);
      if (!gfx) {
        continue;
      }
      const pos = gizmoHandleLocalPosition(handle, width, height, 0, 0, 0, 0);
      gfx.position.set(pos.x, pos.y);
      gfx.scale.set(inv.x, inv.y);
      gfx.cursor = sizeHandleCursor(handle, rotationDeg, flip);
    }
  }

  layoutPolygon(
    points: readonly Vec2[],
    worldChromeScale: number | { x: number; y: number } = 1,
  ): void {
    this.setSizeHandlesVisible(false);
    this.setPolygonHandlesVisible(true);
    const inv = chromeInvScale(worldChromeScale);
    this.ensureVertexCount(points.length);
    this.ensureEdgeCount(points.length);
    for (let i = 0; i < points.length; i += 1) {
      const vertex = this.vertexHandles[i];
      const point = points[i];
      if (!vertex || !point) {
        continue;
      }
      vertex.position.set(point.x, point.y);
      vertex.scale.set(inv.x, inv.y);
      const next = points[(i + 1) % points.length];
      const edge = this.edgeHandles[i];
      if (!edge || !next) {
        continue;
      }
      edge.position.set((point.x + next.x) / 2, (point.y + next.y) / 2);
      edge.scale.set(inv.x, inv.y);
    }
  }

  private setSizeHandlesVisible(visible: boolean): void {
    for (const gfx of this.sizeHandles.values()) {
      gfx.visible = visible;
    }
  }

  private setPolygonHandlesVisible(visible: boolean): void {
    for (const gfx of this.vertexHandles) {
      gfx.visible = visible;
    }
    for (const gfx of this.edgeHandles) {
      gfx.visible = visible;
    }
  }

  private ensureVertexCount(count: number): void {
    while (this.vertexHandles.length < count) {
      this.vertexHandles.push(this.createVertexHandle(this.vertexHandles.length));
    }
    for (let i = 0; i < this.vertexHandles.length; i += 1) {
      const gfx = this.vertexHandles[i]!;
      gfx.visible = i < count;
    }
  }

  private ensureEdgeCount(count: number): void {
    while (this.edgeHandles.length < count) {
      this.edgeHandles.push(this.createEdgeHandle(this.edgeHandles.length));
    }
    for (let i = 0; i < this.edgeHandles.length; i += 1) {
      const gfx = this.edgeHandles[i]!;
      gfx.visible = i < count;
    }
  }

  private createSizeHandle(handle: SpriteSizeHandle): void {
    const gfx = new Graphics();
    gfx.label = `${this.style.labelPrefix}:${handle}`;
    gfx.eventMode = "static";
    gfx.cursor = sizeHandleCursor(handle);
    gfx.zIndex = 2;
    const half = HANDLE_SIZE / 2;
    gfx.roundRect(-half, -half, HANDLE_SIZE, HANDLE_SIZE, 2);
    gfx.fill({ color: this.style.handleFill });
    gfx.stroke({
      width: EDITOR_SELECTION_STROKE_WIDTH,
      color: this.style.stroke,
    });
    const extent = SPRITE_GIZMO_HANDLE_HIT_EXTENT;
    gfx.hitArea = {
      contains: (x: number, y: number) =>
        Math.abs(x) <= extent && Math.abs(y) <= extent,
    };
    gfx.on("pointerdown", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      this.handlers.onHandlePointerDown({ kind: "size", handle }, event);
    });
    this.sizeHandles.set(handle, gfx);
    this.root.addChild(gfx);
  }

  private createVertexHandle(index: number): Graphics {
    const gfx = new Graphics();
    gfx.label = `${this.style.labelPrefix}:vertex:${index}`;
    gfx.eventMode = "static";
    gfx.cursor = "move";
    gfx.zIndex = 3;
    gfx.circle(0, 0, VERTEX_RADIUS);
    gfx.fill({ color: this.style.handleFill });
    gfx.stroke({
      width: EDITOR_SELECTION_STROKE_WIDTH,
      color: this.style.stroke,
    });
    const extent = SPRITE_GIZMO_HANDLE_HIT_EXTENT;
    gfx.hitArea = {
      contains: (x: number, y: number) =>
        Math.abs(x) <= extent && Math.abs(y) <= extent,
    };
    gfx.on("pointerdown", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      this.handlers.onHandlePointerDown({ kind: "vertex", index }, event);
    });
    this.root.addChild(gfx);
    return gfx;
  }

  private createEdgeHandle(index: number): Graphics {
    const gfx = new Graphics();
    gfx.label = `${this.style.labelPrefix}:edge:${index}`;
    gfx.eventMode = "static";
    gfx.cursor = "copy";
    gfx.zIndex = 1;
    gfx.circle(0, 0, EDGE_RADIUS);
    gfx.fill({ color: this.style.handleFill, alpha: 0.9 });
    gfx.stroke({
      width: EDITOR_SELECTION_STROKE_WIDTH,
      color: this.style.stroke,
    });
    gfx.hitArea = {
      contains: (x: number, y: number) =>
        Math.abs(x) <= EDGE_HIT_EXTENT && Math.abs(y) <= EDGE_HIT_EXTENT,
    };
    gfx.on("pointerdown", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      this.handlers.onHandlePointerDown({ kind: "edge", index }, event);
    });
    this.root.addChild(gfx);
    return gfx;
  }
}

function chromeInvScale(
  worldChromeScale: number | { x: number; y: number },
): Vec2 {
  const scaleX =
    typeof worldChromeScale === "number"
      ? worldChromeScale
      : worldChromeScale.x;
  const scaleY =
    typeof worldChromeScale === "number"
      ? worldChromeScale
      : worldChromeScale.y;
  return {
    x: viewportChromeInvScale(scaleX),
    y: viewportChromeInvScale(scaleY),
  };
}
