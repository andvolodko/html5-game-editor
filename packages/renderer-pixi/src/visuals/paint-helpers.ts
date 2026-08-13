import type { Container, Texture } from "pixi.js";
import {
  DEFAULT_MESH_FALLBACK_SIZE,
  DEFAULT_MESH_PLANE_SIZE,
  DEFAULT_MESH_ROPE_BOUNDS_PAD_Y,
  type VisualComponentData,
} from "@game-editor/scene";
import type {
  VisualBounds,
  VisualPaintContext,
  VisualPaintResult,
} from "./types.js";
import {
  PLACEHOLDER_MISSING_TINT,
  PLACEHOLDER_UNASSIGNED_TINT,
} from "../editor-chrome.js";

export function destroyVisual(visual: Container | undefined): void {
  if (!visual) {
    return;
  }
  visual.removeFromParent();
  visual.destroy({ children: true });
}

export function ensureChild(visualsRoot: Container, visual: Container): void {
  if (visual.parent !== visualsRoot) {
    visualsRoot.addChildAt(visual, 0);
  }
}

export function centeredBounds(width: number, height: number): VisualBounds {
  return anchoredBounds(width, height, { x: 0.5, y: 0.5 });
}

/** Local AABB for a display sized around a 0–1 anchor (Pixi sprite/text space). */
export function anchoredBounds(
  width: number,
  height: number,
  anchor?: { x: number; y: number },
): VisualBounds {
  const ax = anchor?.x ?? 0.5;
  const ay = anchor?.y ?? 0.5;
  return {
    x: -ax * width,
    y: -ay * height,
    width,
    height,
  };
}

/** Prefer Pixi local AABB so selection matches vertex-based meshes/ropes. */
export function localBoundsOf(
  view: Container,
  fallback: VisualBounds,
): VisualBounds {
  try {
    const b = view.getLocalBounds();
    if (Number.isFinite(b.width) && Number.isFinite(b.height) && b.width > 0 && b.height > 0) {
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    }
  } catch {
    // Headless / no renderer metrics.
  }
  return fallback;
}

export function boundsFromVertices(vertices: number[]): VisualBounds {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (let i = 0; i + 1 < vertices.length; i += 2) {
    const x = vertices[i]!;
    const y = vertices[i + 1]!;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minX)) {
    return centeredBounds(DEFAULT_MESH_FALLBACK_SIZE, DEFAULT_MESH_FALLBACK_SIZE);
  }
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

export function boundsFromPoints(
  points: ReadonlyArray<{ x: number; y: number }>,
  padY = DEFAULT_MESH_ROPE_BOUNDS_PAD_Y,
): VisualBounds {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  if (!Number.isFinite(minX)) {
    return centeredBounds(DEFAULT_MESH_PLANE_SIZE, padY * 2);
  }
  return {
    x: minX,
    y: minY - padY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY + padY * 2),
  };
}

export async function resolveTexture(
  ctx: VisualPaintContext,
  assetId: string | undefined,
): Promise<{ texture: Texture | undefined; missing: boolean }> {
  if (!assetId) {
    return { texture: undefined, missing: false };
  }
  const url = ctx.textures.resolveUrl(assetId);
  if (!url) {
    ctx.warnMissingAsset(assetId);
    return { texture: undefined, missing: true };
  }
  try {
    const texture = await ctx.textures.loadTexture(assetId, url);
    return { texture, missing: false };
  } catch (error) {
    console.warn("[renderer] texture load failed", {
      category: "renderer",
      assetId,
      nodeId: ctx.node.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return { texture: undefined, missing: true };
  }
}

export function missingTextureResult(
  ctx: VisualPaintContext,
  type: VisualComponentData["type"],
  width: number,
  height: number,
  supportsSpriteGizmo = false,
): VisualPaintResult {
  destroyVisual(ctx.visual);
  ctx.showPlaceholder(width, height, PLACEHOLDER_MISSING_TINT);
  return {
    visual: undefined,
    visualType: type,
    bounds: centeredBounds(width, height),
    ...(supportsSpriteGizmo ? { supportsSpriteGizmo: true } : {}),
  };
}

export function unassignedTextureResult(
  ctx: VisualPaintContext,
  type: VisualComponentData["type"],
  width: number,
  height: number,
  tint = PLACEHOLDER_UNASSIGNED_TINT,
  supportsSpriteGizmo = false,
): VisualPaintResult {
  destroyVisual(ctx.visual);
  ctx.showPlaceholder(width, height, tint);
  return {
    visual: undefined,
    visualType: type,
    bounds: centeredBounds(width, height),
    ...(supportsSpriteGizmo ? { supportsSpriteGizmo: true } : {}),
  };
}
