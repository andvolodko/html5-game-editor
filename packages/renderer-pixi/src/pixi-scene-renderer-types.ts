import type { AssetResolver } from "@game-editor/assets";
import type { GraphicsShapeData, HitZoneComponentData, MaskComponentData, Vec2 } from "@game-editor/scene";
import type { ViewportPointerModifiers } from "@game-editor/shared";
import type { PixelGridStyle } from "./pixel-grid.js";

export interface PixiSceneRendererOptions {
  canvasParent: HTMLElement;
  background?: number;
  /** 0–1 clear alpha (0 = transparent overlay for hybrid FG). */
  backgroundAlpha?: number;
  /**
   * Resolve scene assetIds to fetchable URLs.
   * Prefer AssetResolver; a plain function is accepted for convenience.
   */
  assetResolver?: AssetResolver;
  /** @deprecated Prefer `assetResolver`. */
  resolveAssetUrl?: (assetId: string) => string | undefined;
  /**
   * Skip WebGL Application init (display-tree ops only).
   * Intended for unit tests of create/reparent/destroy identity.
   */
  headless?: boolean;
  /**
   * Editor-only pixel grid behind world content.
   * Off by default so game runtimes are unaffected.
   */
  pixelGrid?: boolean | Partial<PixelGridStyle>;
  /**
   * Editor-only popular screen-size outlines (LS/PT).
   * Off by default so game runtimes are unaffected.
   */
  screenGuides?: boolean;
  /**
   * When false, omit node drag, selection gizmos, grab cursors, and
   * editor preview camera pan/wheel zoom. Use for game runtime / preview.
   */
  editable?: boolean;
  /**
   * Design resolution for playback. Canvas CSS fills `canvasParent` while
   * the backbuffer expand-fits that parent (design stays centered; leftover
   * bands stay in Pixi). Omit for the Scene editor, which tracks the host via
   * resizeTo.
   */
  designResolution?: { width: number; height: number };
}

export interface PixiGizmoResizeResult {
  width: number;
  height: number;
}

export interface PixiGizmoAnchorResult {
  anchor: Vec2;
  position: Vec2;
}

export interface NodePositionDrag {
  nodeId: string;
  start: Vec2;
  end: Vec2;
}

export interface PixiPointerHandlers {
  onBackgroundPointerDown?: () => void;
  /**
   * Stage-level world pointer (capture). Return true to consume the gesture
   * (skip node drag / background clear). Used by tilemap painting and marquee.
   */
  onWorldPointerDown?: (
    world: Vec2,
    button: number,
    modifiers: ViewportPointerModifiers,
    client: { x: number; y: number },
  ) => boolean;
  onWorldPointerMove?: (world: Vec2) => void;
  onWorldPointerUp?: (world: Vec2) => void;
  onNodePointerDown?: (
    nodeId: string,
    world: Vec2,
    modifiers?: ViewportPointerModifiers,
  ) => void;
  onNodePointerMove?: (nodeId: string, world: Vec2) => void;
  onNodePointerUp?: (moves: readonly NodePositionDrag[]) => void;
  /** Playback / preview: press+release without drag on a node. */
  onNodeClick?: (nodeId: string) => void;
  /**
   * Playback / preview pointer events (`pointerdown`, `pointertap`, …).
   * Prefer this over `onNodeClick` for new hosts.
   */
  onNodePointerEvent?: (
    nodeId: string,
    event:
      | "pointerdown"
      | "pointerup"
      | "pointertap"
      | "pointerover"
      | "pointerout",
  ) => void;
  onGizmoResizeEnd?: (nodeId: string, size: PixiGizmoResizeResult) => void;
  onGizmoRotateEnd?: (nodeId: string, rotation: number) => void;
  onGizmoScaleEnd?: (nodeId: string, scale: Vec2) => void;
  onGizmoAnchorEnd?: (nodeId: string, result: PixiGizmoAnchorResult) => void;
  onGizmoFlip?: (nodeId: string, axis: "x" | "y") => void;
  onHitZoneResizeEnd?: (nodeId: string, hitZone: HitZoneComponentData) => void;
  onMaskResizeEnd?: (nodeId: string, mask: MaskComponentData) => void;
  onGraphicsPolygonEnd?: (nodeId: string, shape: GraphicsShapeData) => void;
}

export interface PixiSyncStats {
  created: number;
  destroyed: number;
  reparented: number;
  updated: number;
}
