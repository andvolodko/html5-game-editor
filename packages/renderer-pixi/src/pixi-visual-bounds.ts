import {
  DEFAULT_MESH_FALLBACK_SIZE,
  DEFAULT_MESH_ROPE_BOUNDS_PAD_Y,
  DEFAULT_SPRITE_SIZE,
  DEFAULT_TILEMAP_EMPTY_EXTENT_TILES,
  getVisualAnchorOrDefault,
  particleSpawnLocalBounds,
  tilemapLocalBounds,
  type Vec2,
  type VisualComponentData,
} from "@game-editor/scene";
import type { VisualBounds } from "./visuals/types.js";
import {
  TEXT_PROVISIONAL_HEIGHT_EM,
  TEXT_PROVISIONAL_WIDTH_EM,
} from "./editor-chrome.js";

function centeredFallback(width: number, height: number): VisualBounds {
  return anchoredFallback(width, height, { x: 0.5, y: 0.5 });
}

function anchoredFallback(
  width: number,
  height: number,
  anchor: Vec2,
): VisualBounds {
  return {
    x: -anchor.x * width,
    y: -anchor.y * height,
    width,
    height,
  };
}

export function defaultVisualBounds(width: number, height: number): VisualBounds {
  return centeredFallback(width, height);
}

/** Hit-area estimate before async paint completes (keeps picks responsive). */
export function provisionalVisualBounds(
  data: VisualComponentData,
): VisualBounds | undefined {
  switch (data.type) {
    case "Sprite":
    case "TilingSprite":
      return anchoredFallback(
        data.width,
        data.height,
        getVisualAnchorOrDefault(data),
      );
    case "NineSliceSprite":
    case "MeshPlane":
      return centeredFallback(data.width, data.height);
    case "AnimatedSprite": {
      const w = data.width ?? DEFAULT_SPRITE_SIZE;
      const h = data.height ?? DEFAULT_SPRITE_SIZE;
      return anchoredFallback(w, h, getVisualAnchorOrDefault(data));
    }
    case "PerspectiveMesh": {
      const xs = data.corners.map((c) => c.x);
      const ys = data.corners.map((c) => c.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      return {
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
      };
    }
    case "Graphics": {
      const shape = data.shape;
      if (shape.type === "circle") {
        return centeredFallback(shape.radius * 2, shape.radius * 2);
      }
      if (shape.type === "polygon") {
        const xs = shape.points.map((p) => p.x);
        const ys = shape.points.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        return {
          x: minX,
          y: minY,
          width: Math.max(1, maxX - minX),
          height: Math.max(1, maxY - minY),
        };
      }
      return centeredFallback(shape.width, shape.height);
    }
    case "Text":
    case "HTMLText":
      return centeredFallback(
        data.style.fontSize * TEXT_PROVISIONAL_WIDTH_EM,
        data.style.fontSize * TEXT_PROVISIONAL_HEIGHT_EM,
      );
    case "BitmapText":
      return centeredFallback(
        data.fontSize * TEXT_PROVISIONAL_WIDTH_EM,
        data.fontSize * TEXT_PROVISIONAL_HEIGHT_EM,
      );
    case "Mesh":
    case "MeshSimple": {
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      for (let i = 0; i + 1 < data.vertices.length; i += 2) {
        const x = data.vertices[i]!;
        const y = data.vertices[i + 1]!;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
      if (!Number.isFinite(minX)) {
        return centeredFallback(
          DEFAULT_MESH_FALLBACK_SIZE,
          DEFAULT_MESH_FALLBACK_SIZE,
        );
      }
      return {
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
      };
    }
    case "MeshRope": {
      const xs = data.points.map((p) => p.x);
      const ys = data.points.map((p) => p.y);
      const pad = DEFAULT_MESH_ROPE_BOUNDS_PAD_Y;
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys) - pad;
      const maxY = Math.max(...ys) + pad;
      return {
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
      };
    }
    case "Spine":
      return centeredFallback(DEFAULT_SPRITE_SIZE, DEFAULT_SPRITE_SIZE);
    case "Tilemap":
      return tilemapLocalBounds(data, DEFAULT_TILEMAP_EMPTY_EXTENT_TILES);
    case "ParticleEmitter":
      return particleSpawnLocalBounds(data);
    default: {
      const _exhaustive: never = data;
      return _exhaustive;
    }
  }
}
