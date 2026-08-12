import type { Container, Texture } from "pixi.js";
import type { AssetResolver } from "@game-editor/assets";
import type {
  SceneNodeData,
  VisualComponentData,
} from "@game-editor/scene";

export interface VisualBounds {
  /** Local-space top-left of the visual AABB (not assumed centered). */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextureLoadContext {
  loadTexture: (assetId: string, url: string) => Promise<Texture>;
  resolveUrl: (assetId: string) => string | undefined;
  whiteTexture: () => Texture;
}

export interface VisualPaintContext {
  node: SceneNodeData;
  data: VisualComponentData;
  visualsRoot: Container;
  /** Existing visual display object for this node, if any. */
  visual: Container | undefined;
  /** Previous visual component type (to detect recreate). */
  visualType: string | undefined;
  textures: TextureLoadContext;
  assetResolver: AssetResolver | undefined;
  showPlaceholder: (
    width: number,
    height: number,
    tint: number,
  ) => void;
  hidePlaceholder: () => void;
  warnMissingAsset: (assetId: string) => void;
}

export interface VisualPaintResult {
  visual: Container | undefined;
  visualType: string;
  /** Local AABB for hit testing / selection outline. */
  bounds?: VisualBounds;
  /** True when the visual is a Pixi Sprite suitable for size gizmo. */
  supportsSpriteGizmo?: boolean;
}

export interface PixiVisualPainter {
  type: VisualComponentData["type"];
  paint(ctx: VisualPaintContext): Promise<VisualPaintResult>;
}
