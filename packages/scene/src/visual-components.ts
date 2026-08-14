import type { Vec2 } from "./types.js";
import {
  DEFAULT_MESH_PLANE_SIZE,
  DEFAULT_NINE_SLICE_HEIGHT,
  DEFAULT_NINE_SLICE_WIDTH,
  DEFAULT_SPRITE_SIZE,
  DEFAULT_TEXT_FILL,
  DEFAULT_TILING_SPRITE_SIZE,
} from "./defaults.js";

/**
 * Stable visual component discriminants (domain identity — not PIXI class names).
 * Editor registry IDs map as `pixi.<kebab>` → these PascalCase types.
 */

export interface SpriteComponentData {
  type: "Sprite";
  id: string;
  /** Stable asset id — never a filesystem path. Optional for placeholder sprites. */
  assetId?: string;
  /** Display width override (px). Not automatically updated when the asset changes. */
  width: number;
  /** Display height override (px). Not automatically updated when the asset changes. */
  height: number;
  /** Texture anchor in 0–1 UV space. Defaults to center when omitted. */
  anchor?: Vec2;
  /** Optional hex RGB tint. Omitted means no tint (renderer default). */
  tint?: number;
}

export interface NineSliceSpriteComponentData {
  type: "NineSliceSprite";
  id: string;
  assetId?: string;
  width: number;
  height: number;
  leftWidth: number;
  rightWidth: number;
  topHeight: number;
  bottomHeight: number;
  tint?: number;
}

export interface TilingSpriteComponentData {
  type: "TilingSprite";
  id: string;
  assetId?: string;
  width: number;
  height: number;
  tilePosition: Vec2;
  tileScale: Vec2;
  tileRotation: number;
  anchor?: Vec2;
  tint?: number;
}

export type GraphicsShapeData =
  | {
      type: "rectangle";
      width: number;
      height: number;
    }
  | {
      type: "rounded-rectangle";
      width: number;
      height: number;
      radius: number;
    }
  | {
      type: "circle";
      radius: number;
    }
  | {
      type: "ellipse";
      width: number;
      height: number;
    }
  | {
      type: "polygon";
      points: Vec2[];
    };

export interface GraphicsComponentData {
  type: "Graphics";
  id: string;
  shape: GraphicsShapeData;
  fillColor: number;
  fillAlpha: number;
  strokeColor: number;
  strokeAlpha: number;
  strokeWidth: number;
}

export const TEXT_ALIGN_OPTIONS = ["left", "center", "right", "justify"] as const;
export type TextAlign = (typeof TEXT_ALIGN_OPTIONS)[number];

export const TEXT_FONT_WEIGHT_OPTIONS = [
  "normal",
  "bold",
  "bolder",
  "lighter",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
] as const;
export type TextFontWeight = (typeof TEXT_FONT_WEIGHT_OPTIONS)[number];

export const TEXT_FONT_STYLE_OPTIONS = ["normal", "italic", "oblique"] as const;
export type TextFontStyle = (typeof TEXT_FONT_STYLE_OPTIONS)[number];

export const TEXT_FONT_VARIANT_OPTIONS = ["normal", "small-caps"] as const;
export type TextFontVariant = (typeof TEXT_FONT_VARIANT_OPTIONS)[number];

export const TEXT_WHITE_SPACE_OPTIONS = ["normal", "pre", "pre-line"] as const;
export type TextWhiteSpace = (typeof TEXT_WHITE_SPACE_OPTIONS)[number];

export const TEXT_BASELINE_OPTIONS = [
  "alphabetic",
  "top",
  "hanging",
  "middle",
  "ideographic",
  "bottom",
] as const;
export type TextBaseline = (typeof TEXT_BASELINE_OPTIONS)[number];

export const TEXT_STROKE_JOIN_OPTIONS = ["miter", "round", "bevel"] as const;
export type TextStrokeJoin = (typeof TEXT_STROKE_JOIN_OPTIONS)[number];

/** Solid RGB hex, or two-or-more stops for a linear fill gradient (Pixi `fill: number[]`). */
export type TextStyleFill = number | number[];

export interface TextStyleData {
  fontFamily: string;
  /** Catalogue webfont asset. Unset → use `fontFamily` as a system/CSS family. */
  fontAssetId?: string;
  fontSize: number;
  fontWeight: TextFontWeight;
  fontStyle: TextFontStyle;
  fontVariant: TextFontVariant;
  fill: TextStyleFill;
  fillAlpha: number;
  align: TextAlign;
  letterSpacing: number;
  lineHeight: number;
  leading: number;
  wordWrap: boolean;
  wordWrapWidth: number;
  breakWords: boolean;
  whiteSpace: TextWhiteSpace;
  padding: number;
  trim: boolean;
  textBaseline: TextBaseline;
  strokeColor: number;
  strokeAlpha: number;
  strokeWidth: number;
  strokeJoin: TextStrokeJoin;
  miterLimit: number;
  dropShadow: boolean;
  dropShadowColor: number;
  dropShadowAlpha: number;
  dropShadowBlur: number;
  dropShadowDistance: number;
  /** Drop-shadow direction in degrees (engine-neutral; renderer converts to radians). */
  dropShadowAngle: number;
}

/** Expand a solid fill or gradient into ordered RGB stops. */
export function textStyleFillStops(fill: TextStyleFill): number[] {
  return Array.isArray(fill) ? [...fill] : [fill];
}

/** Persist one stop as a number; two or more as a gradient array. */
export function compactTextStyleFill(stops: readonly number[]): TextStyleFill {
  if (stops.length <= 1) {
    return stops[0] ?? DEFAULT_TEXT_FILL;
  }
  return [...stops];
}

export interface TextComponentData {
  type: "Text";
  id: string;
  text: string;
  style: TextStyleData;
  anchor?: Vec2;
}

export interface BitmapTextComponentData {
  type: "BitmapText";
  id: string;
  text: string;
  /** Catalogue bitmap-font asset. Unassigned → placeholder. */
  assetId?: string;
  /** Legacy / override family name after the font asset is loaded. */
  fontFamily?: string;
  fontSize: number;
  align: "left" | "center" | "right";
  letterSpacing: number;
  tint?: number;
  anchor?: Vec2;
}

export interface HTMLTextComponentData {
  type: "HTMLText";
  id: string;
  text: string;
  style: TextStyleData;
  anchor?: Vec2;
}

export interface MeshSimpleComponentData {
  type: "MeshSimple";
  id: string;
  assetId?: string;
  vertices: number[];
  uvs: number[];
  indices: number[];
  autoUpdate: boolean;
}

export interface MeshRopeComponentData {
  type: "MeshRope";
  id: string;
  assetId?: string;
  points: Vec2[];
  textureScale: number;
  autoUpdate: boolean;
}

export interface MeshPlaneComponentData {
  type: "MeshPlane";
  id: string;
  assetId?: string;
  width: number;
  height: number;
  verticesX: number;
  verticesY: number;
}

export interface PerspectiveMeshComponentData {
  type: "PerspectiveMesh";
  id: string;
  assetId?: string;
  width: number;
  height: number;
  verticesX: number;
  verticesY: number;
  /** Quad corners in local space: TL, TR, BR, BL. */
  corners: [Vec2, Vec2, Vec2, Vec2];
}

/**
 * Raw Mesh with a default textured quad. Shader editing is out of scope —
 * renderer uses the built-in texture mesh path.
 */
export interface MeshComponentData {
  type: "Mesh";
  id: string;
  assetId?: string;
  vertices: number[];
  uvs: number[];
  indices: number[];
}

export interface AnimatedSpriteComponentData {
  type: "AnimatedSprite";
  id: string;
  /**
   * Frame textures by stable asset id (order = animation order).
   * Empty when `assetId` points at an Aseprite spritesheet.
   */
  frames: string[];
  /**
   * Optional Aseprite (or future spritesheet) asset id.
   * Scenes persist this id — never a generated PNG/JSON path.
   */
  assetId?: string;
  /** Aseprite tag name when `assetId` is an Aseprite asset. */
  animation?: string;
  animationSpeed: number;
  loop: boolean;
  playing: boolean;
  anchor?: Vec2;
  tint?: number;
  width?: number;
  height?: number;
}

export interface SpineComponentData {
  type: "Spine";
  id: string;
  /** Stable spine asset id — never a filesystem path. */
  assetId?: string;
  skin?: string;
  animation?: string;
  loop: boolean;
  timeScale: number;
  playing: boolean;
}

export type VisualComponentData =
  | SpriteComponentData
  | NineSliceSpriteComponentData
  | TilingSpriteComponentData
  | GraphicsComponentData
  | TextComponentData
  | BitmapTextComponentData
  | HTMLTextComponentData
  | MeshComponentData
  | MeshSimpleComponentData
  | MeshRopeComponentData
  | MeshPlaneComponentData
  | PerspectiveMeshComponentData
  | AnimatedSpriteComponentData
  | SpineComponentData;

/** Component types that are renderable leaves (may not receive scene children). */
export const LEAF_VISUAL_COMPONENT_TYPES = [
  "Sprite",
  "NineSliceSprite",
  "TilingSprite",
  "Graphics",
  "Text",
  "BitmapText",
  "HTMLText",
  "Mesh",
  "MeshSimple",
  "MeshRope",
  "MeshPlane",
  "PerspectiveMesh",
  "AnimatedSprite",
  "Spine",
] as const;

export type LeafVisualComponentType =
  (typeof LEAF_VISUAL_COMPONENT_TYPES)[number];

export function isLeafVisualComponentType(
  type: string,
): type is LeafVisualComponentType {
  return (LEAF_VISUAL_COMPONENT_TYPES as readonly string[]).includes(type);
}

/** Default texture/layout anchor (center) when omitted on supporting visuals. */
export const DEFAULT_VISUAL_ANCHOR: Vec2 = { x: 0.5, y: 0.5 };

const ANCHOR_VISUAL_TYPES = new Set<LeafVisualComponentType>([
  "Sprite",
  "TilingSprite",
  "Text",
  "BitmapText",
  "HTMLText",
  "AnimatedSprite",
]);

/** Whether the leaf visual exposes a 0–1 UV/layout `anchor` field. */
export function visualComponentSupportsAnchor(
  visual: VisualComponentData,
): boolean {
  return ANCHOR_VISUAL_TYPES.has(visual.type);
}

/**
 * Leaf visuals whose display size is a top-level `width`/`height` (gizmo resize
 * + inspector size fields). Graphics shape size and text metrics are excluded.
 */
const DISPLAY_SIZE_VISUAL_TYPES = new Set<LeafVisualComponentType>([
  "Sprite",
  "NineSliceSprite",
  "TilingSprite",
  "MeshPlane",
  "PerspectiveMesh",
  "AnimatedSprite",
]);

/** Whether gizmo/inspector can patch top-level width/height on this visual. */
export function visualComponentSupportsDisplaySize(
  visual: VisualComponentData,
): boolean {
  return DISPLAY_SIZE_VISUAL_TYPES.has(visual.type);
}

/** Factory default width/height for visuals that store a display size. */
export function defaultVisualDisplaySize(
  visual: VisualComponentData,
): { width: number; height: number } | undefined {
  switch (visual.type) {
    case "Sprite":
    case "AnimatedSprite":
      return { width: DEFAULT_SPRITE_SIZE, height: DEFAULT_SPRITE_SIZE };
    case "NineSliceSprite":
      return {
        width: DEFAULT_NINE_SLICE_WIDTH,
        height: DEFAULT_NINE_SLICE_HEIGHT,
      };
    case "TilingSprite":
      return {
        width: DEFAULT_TILING_SPRITE_SIZE,
        height: DEFAULT_TILING_SPRITE_SIZE,
      };
    case "MeshPlane":
    case "PerspectiveMesh":
      return {
        width: DEFAULT_MESH_PLANE_SIZE,
        height: DEFAULT_MESH_PLANE_SIZE,
      };
    default:
      return undefined;
  }
}

/**
 * Resolved display size when the visual stores width/height.
 * AnimatedSprite may omit size until set — returns undefined then.
 */
export function getVisualDisplaySize(
  visual: VisualComponentData,
): { width: number; height: number } | undefined {
  if (!visualComponentSupportsDisplaySize(visual)) {
    return undefined;
  }
  if (visual.type === "AnimatedSprite") {
    if (visual.width === undefined || visual.height === undefined) {
      return undefined;
    }
    return { width: visual.width, height: visual.height };
  }
  if (
    visual.type === "Sprite" ||
    visual.type === "NineSliceSprite" ||
    visual.type === "TilingSprite" ||
    visual.type === "MeshPlane" ||
    visual.type === "PerspectiveMesh"
  ) {
    return { width: visual.width, height: visual.height };
  }
  return undefined;
}

/** Resolved anchor for paint/UI (defaults to center when omitted). */
export function getVisualAnchorOrDefault(visual: VisualComponentData): Vec2 {
  if (!visualComponentSupportsAnchor(visual)) {
    return { ...DEFAULT_VISUAL_ANCHOR };
  }
  const anchor =
    "anchor" in visual && visual.anchor !== undefined
      ? visual.anchor
      : undefined;
  return anchor
    ? { x: anchor.x, y: anchor.y }
    : { ...DEFAULT_VISUAL_ANCHOR };
}
