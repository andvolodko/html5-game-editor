import type { AssetResolver } from "@game-editor/assets";
import type { Vec2 } from "@game-editor/scene";
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
   * Fixed design resolution buffer. Canvas CSS fills `canvasParent` while
   * the backbuffer stays at this size (preview / runtime letterboxing).
   * Omit for the Scene editor, which tracks the host via resizeTo.
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

export interface PixiPointerHandlers {
  onBackgroundPointerDown?: () => void;
  onNodePointerDown?: (nodeId: string, world: Vec2) => void;
  onNodePointerMove?: (nodeId: string, world: Vec2) => void;
  onNodePointerUp?: (nodeId: string, start: Vec2, end: Vec2) => void;
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
}

export interface PixiSyncStats {
  created: number;
  destroyed: number;
  reparented: number;
  updated: number;
}
