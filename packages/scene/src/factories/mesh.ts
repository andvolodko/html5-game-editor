import { createId } from "@game-editor/shared";
import type {
  MeshComponentData,
  MeshPlaneComponentData,
  MeshRopeComponentData,
  MeshSimpleComponentData,
  PerspectiveMeshComponentData,
  Vec2,
} from "../types.js";
import {
  DEFAULT_MESH_PLANE_SIZE,
  DEFAULT_MESH_QUAD_HALF_EXTENT,
  DEFAULT_MESH_ROPE_SPAN,
  DEFAULT_MESH_SUBDIVISIONS,
} from "../defaults.js";

const H = DEFAULT_MESH_QUAD_HALF_EXTENT;
const DEFAULT_QUAD_VERTICES = [-H, -H, H, -H, H, H, -H, H];
const DEFAULT_QUAD_UVS = [0, 0, 1, 0, 1, 1, 0, 1];
const DEFAULT_QUAD_INDICES = [0, 1, 2, 0, 2, 3];

export function createMeshSimpleComponent(
  partial?: Partial<Omit<MeshSimpleComponentData, "type" | "id">> & {
    id?: string;
  },
): MeshSimpleComponentData {
  const data: MeshSimpleComponentData = {
    type: "MeshSimple",
    id: partial?.id ?? createId("comp"),
    vertices: partial?.vertices ? [...partial.vertices] : [...DEFAULT_QUAD_VERTICES],
    uvs: partial?.uvs ? [...partial.uvs] : [...DEFAULT_QUAD_UVS],
    indices: partial?.indices ? [...partial.indices] : [...DEFAULT_QUAD_INDICES],
    autoUpdate: partial?.autoUpdate ?? true,
  };
  if (partial?.assetId !== undefined) {
    data.assetId = partial.assetId;
  }
  return data;
}

export function createMeshRopeComponent(
  partial?: Partial<Omit<MeshRopeComponentData, "type" | "id">> & {
    id?: string;
  },
): MeshRopeComponentData {
  const span = DEFAULT_MESH_ROPE_SPAN;
  const data: MeshRopeComponentData = {
    type: "MeshRope",
    id: partial?.id ?? createId("comp"),
    points: partial?.points
      ? partial.points.map((p) => ({ ...p }))
      : [
          { x: -span, y: 0 },
          { x: 0, y: 0 },
          { x: span, y: 0 },
        ],
    textureScale: partial?.textureScale ?? 1,
    autoUpdate: partial?.autoUpdate ?? true,
  };
  if (partial?.assetId !== undefined) {
    data.assetId = partial.assetId;
  }
  return data;
}

export function createMeshPlaneComponent(
  partial?: Partial<Omit<MeshPlaneComponentData, "type" | "id">> & {
    id?: string;
  },
): MeshPlaneComponentData {
  const data: MeshPlaneComponentData = {
    type: "MeshPlane",
    id: partial?.id ?? createId("comp"),
    width: partial?.width ?? DEFAULT_MESH_PLANE_SIZE,
    height: partial?.height ?? DEFAULT_MESH_PLANE_SIZE,
    verticesX: partial?.verticesX ?? DEFAULT_MESH_SUBDIVISIONS,
    verticesY: partial?.verticesY ?? DEFAULT_MESH_SUBDIVISIONS,
  };
  if (partial?.assetId !== undefined) {
    data.assetId = partial.assetId;
  }
  return data;
}

export function createPerspectiveMeshComponent(
  partial?: Partial<Omit<PerspectiveMeshComponentData, "type" | "id">> & {
    id?: string;
  },
): PerspectiveMeshComponentData {
  const width = partial?.width ?? DEFAULT_MESH_PLANE_SIZE;
  const height = partial?.height ?? DEFAULT_MESH_PLANE_SIZE;
  const data: PerspectiveMeshComponentData = {
    type: "PerspectiveMesh",
    id: partial?.id ?? createId("comp"),
    width,
    height,
    verticesX: partial?.verticesX ?? DEFAULT_MESH_SUBDIVISIONS,
    verticesY: partial?.verticesY ?? DEFAULT_MESH_SUBDIVISIONS,
    corners: partial?.corners
      ? (partial.corners.map((c) => ({ ...c })) as [
          Vec2,
          Vec2,
          Vec2,
          Vec2,
        ])
      : [
          { x: -width / 2, y: -height / 2 },
          { x: width / 2, y: -height / 2 },
          { x: width / 2, y: height / 2 },
          { x: -width / 2, y: height / 2 },
        ],
  };
  if (partial?.assetId !== undefined) {
    data.assetId = partial.assetId;
  }
  return data;
}

export function createMeshComponent(
  partial?: Partial<Omit<MeshComponentData, "type" | "id">> & { id?: string },
): MeshComponentData {
  const data: MeshComponentData = {
    type: "Mesh",
    id: partial?.id ?? createId("comp"),
    vertices: partial?.vertices ? [...partial.vertices] : [...DEFAULT_QUAD_VERTICES],
    uvs: partial?.uvs ? [...partial.uvs] : [...DEFAULT_QUAD_UVS],
    indices: partial?.indices ? [...partial.indices] : [...DEFAULT_QUAD_INDICES],
  };
  if (partial?.assetId !== undefined) {
    data.assetId = partial.assetId;
  }
  return data;
}
