import {
  Mesh,
  MeshGeometry,
  MeshPlane,
  MeshRope,
  MeshSimple,
  PerspectiveMesh,
  Point,
} from "pixi.js";
import {
  DEFAULT_MESH_FALLBACK_SIZE,
  DEFAULT_MESH_PLANE_SIZE,
  DEFAULT_MESH_ROPE_PLACEHOLDER_HEIGHT,
  type MeshComponentData,
  type MeshPlaneComponentData,
  type MeshRopeComponentData,
  type MeshSimpleComponentData,
  type PerspectiveMeshComponentData,
} from "@game-editor/scene";
import type { PixiVisualPainter, VisualPaintResult } from "../types.js";
import {
  boundsFromPoints,
  boundsFromVertices,
  centeredBounds,
  destroyVisual,
  ensureChild,
  localBoundsOf,
  missingTextureResult,
  resolveTexture,
} from "../paint-helpers.js";

function float32(values: number[]): Float32Array {
  return new Float32Array(values);
}

function uint32(values: number[]): Uint32Array {
  return new Uint32Array(values);
}

export const meshSimplePainter: PixiVisualPainter = {
  type: "MeshSimple",
  async paint(ctx): Promise<VisualPaintResult> {
    const data = ctx.data as MeshSimpleComponentData;
    const { texture, missing } = await resolveTexture(ctx, data.assetId);
    const tex =
      texture ??
      (data.assetId || missing ? undefined : ctx.textures.whiteTexture());
    if (!tex) {
      return missingTextureResult(
        ctx,
        data.type,
        DEFAULT_MESH_FALLBACK_SIZE,
        DEFAULT_MESH_FALLBACK_SIZE,
      );
    }
    ctx.hidePlaceholder();
    destroyVisual(ctx.visual);
    const fallback = boundsFromVertices(data.vertices);
    const view = new MeshSimple({
      texture: tex,
      vertices: float32(data.vertices),
      uvs: float32(data.uvs),
      indices: uint32(data.indices),
    });
    if ("autoUpdate" in view) {
      (view as MeshSimple & { autoUpdate: boolean }).autoUpdate =
        data.autoUpdate;
    }
    ensureChild(ctx.visualsRoot, view);
    view.visible = true;
    return {
      visual: view,
      visualType: data.type,
      bounds: localBoundsOf(view, fallback),
    };
  },
};

export const meshRopePainter: PixiVisualPainter = {
  type: "MeshRope",
  async paint(ctx): Promise<VisualPaintResult> {
    const data = ctx.data as MeshRopeComponentData;
    const { texture, missing } = await resolveTexture(ctx, data.assetId);
    const tex =
      texture ??
      (data.assetId || missing ? undefined : ctx.textures.whiteTexture());
    if (!tex) {
      return missingTextureResult(
        ctx,
        data.type,
        DEFAULT_MESH_PLANE_SIZE,
        DEFAULT_MESH_ROPE_PLACEHOLDER_HEIGHT,
      );
    }
    ctx.hidePlaceholder();
    destroyVisual(ctx.visual);
    const fallback = boundsFromPoints(data.points);
    const points = data.points.map((p) => new Point(p.x, p.y));
    const view = new MeshRope({
      texture: tex,
      points,
      textureScale: data.textureScale,
    });
    if ("autoUpdate" in view) {
      (view as MeshRope & { autoUpdate: boolean }).autoUpdate = data.autoUpdate;
    }
    ensureChild(ctx.visualsRoot, view);
    view.visible = true;
    return {
      visual: view,
      visualType: data.type,
      bounds: localBoundsOf(view, fallback),
    };
  },
};

export const meshPlanePainter: PixiVisualPainter = {
  type: "MeshPlane",
  async paint(ctx): Promise<VisualPaintResult> {
    const data = ctx.data as MeshPlaneComponentData;
    const { texture, missing } = await resolveTexture(ctx, data.assetId);
    const tex =
      texture ??
      (data.assetId || missing ? undefined : ctx.textures.whiteTexture());
    if (!tex) {
      return missingTextureResult(ctx, data.type, data.width, data.height);
    }
    ctx.hidePlaceholder();
    destroyVisual(ctx.visual);
    const view = new MeshPlane({
      texture: tex,
      verticesX: data.verticesX,
      verticesY: data.verticesY,
    });
    view.width = data.width;
    view.height = data.height;
    // MeshPlane geometry originates at (0,0) — center on the node transform.
    view.position.set(-data.width / 2, -data.height / 2);
    ensureChild(ctx.visualsRoot, view);
    view.visible = true;
    return {
      visual: view,
      visualType: data.type,
      bounds: centeredBounds(data.width, data.height),
    };
  },
};

export const perspectiveMeshPainter: PixiVisualPainter = {
  type: "PerspectiveMesh",
  async paint(ctx): Promise<VisualPaintResult> {
    const data = ctx.data as PerspectiveMeshComponentData;
    const { texture, missing } = await resolveTexture(ctx, data.assetId);
    const tex =
      texture ??
      (data.assetId || missing ? undefined : ctx.textures.whiteTexture());
    if (!tex) {
      return missingTextureResult(ctx, data.type, data.width, data.height);
    }
    ctx.hidePlaceholder();
    destroyVisual(ctx.visual);
    const view = new PerspectiveMesh({
      texture: tex,
      width: data.width,
      height: data.height,
      verticesX: data.verticesX,
      verticesY: data.verticesY,
    });
    const [c0, c1, c2, c3] = data.corners;
    view.setCorners(c0.x, c0.y, c1.x, c1.y, c2.x, c2.y, c3.x, c3.y);
    ensureChild(ctx.visualsRoot, view);
    view.visible = true;
    const fallback = boundsFromPoints(data.corners, 0);
    return {
      visual: view,
      visualType: data.type,
      bounds: localBoundsOf(view, fallback),
    };
  },
};

export const meshPainter: PixiVisualPainter = {
  type: "Mesh",
  async paint(ctx): Promise<VisualPaintResult> {
    const data = ctx.data as MeshComponentData;
    const { texture, missing } = await resolveTexture(ctx, data.assetId);
    const tex =
      texture ??
      (data.assetId || missing ? undefined : ctx.textures.whiteTexture());
    if (!tex) {
      return missingTextureResult(
        ctx,
        data.type,
        DEFAULT_MESH_FALLBACK_SIZE,
        DEFAULT_MESH_FALLBACK_SIZE,
      );
    }
    ctx.hidePlaceholder();
    destroyVisual(ctx.visual);
    const fallback = boundsFromVertices(data.vertices);
    const geometry = new MeshGeometry({
      positions: float32(data.vertices),
      uvs: float32(data.uvs),
      indices: uint32(data.indices),
    });
    const view = new Mesh({ geometry, texture: tex });
    ensureChild(ctx.visualsRoot, view);
    view.visible = true;
    return {
      visual: view,
      visualType: data.type,
      bounds: localBoundsOf(view, fallback),
    };
  },
};
