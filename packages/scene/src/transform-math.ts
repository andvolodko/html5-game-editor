import type { SceneData, Transform2DComponentData, Vec2 } from "./types.js";
import { findNodeById, getTransform2D } from "./queries.js";
import { findParentNode } from "./hierarchy.js";

/**
 * 2D affine matrix matching PixiJS Container local transforms
 * (position, rotation degrees, scale, optional skew degrees).
 */
export interface Aff2 {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

export function identityAff2(): Aff2 {
  return { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
}

export function aff2FromPose(
  position: Vec2,
  rotationDegrees: number,
  scale: Vec2,
  skewDegrees: Vec2 = { x: 0, y: 0 },
): Aff2 {
  const rad = (rotationDegrees * Math.PI) / 180;
  const skewX = (skewDegrees.x * Math.PI) / 180;
  const skewY = (skewDegrees.y * Math.PI) / 180;
  const sx = scale.x;
  const sy = scale.y;
  return {
    a: Math.cos(rad + skewY) * sx,
    b: Math.sin(rad + skewY) * sx,
    c: -Math.sin(rad - skewX) * sy,
    d: Math.cos(rad - skewX) * sy,
    tx: position.x,
    ty: position.y,
  };
}

export function aff2FromTransform2D(transform: Transform2DComponentData): Aff2 {
  return aff2FromPose(
    transform.position,
    transform.rotation,
    transform.scale,
    transform.skew ?? { x: 0, y: 0 },
  );
}

export function multiplyAff2(parent: Aff2, local: Aff2): Aff2 {
  return {
    a: parent.a * local.a + parent.c * local.b,
    b: parent.b * local.a + parent.d * local.b,
    c: parent.a * local.c + parent.c * local.d,
    d: parent.b * local.c + parent.d * local.d,
    tx: parent.a * local.tx + parent.c * local.ty + parent.tx,
    ty: parent.b * local.tx + parent.d * local.ty + parent.ty,
  };
}

export function invertAff2(m: Aff2): Aff2 {
  const det = m.a * m.d - m.b * m.c;
  if (Math.abs(det) < 1e-12) {
    return identityAff2();
  }
  const invDet = 1 / det;
  return {
    a: m.d * invDet,
    b: -m.b * invDet,
    c: -m.c * invDet,
    d: m.a * invDet,
    tx: (m.c * m.ty - m.d * m.tx) * invDet,
    ty: (m.b * m.tx - m.a * m.ty) * invDet,
  };
}

export function decomposeAff2ToTransform2D(
  m: Aff2,
  id: string,
): Transform2DComponentData {
  const scaleX = Math.hypot(m.a, m.b) || 1;
  const scaleY = Math.hypot(m.c, m.d) || 1;
  const rotation = (Math.atan2(m.b, m.a) * 180) / Math.PI;
  // Detect reflection via cross product of basis vectors.
  const cross = m.a * m.d - m.b * m.c;
  const signedScaleY = cross < 0 ? -scaleY : scaleY;
  return {
    type: "Transform2D",
    id,
    position: { x: m.tx, y: m.ty },
    rotation,
    scale: { x: scaleX, y: signedScaleY },
  };
}

export function getWorldAff2(scene: SceneData, nodeId: string): Aff2 {
  const chain: Transform2DComponentData[] = [];
  let currentId: string | undefined = nodeId;
  while (currentId) {
    const node = findNodeById(scene, currentId);
    const transform = node ? getTransform2D(node) : undefined;
    if (transform) {
      chain.push(transform);
    }
    currentId = findParentNode(scene, currentId)?.id;
  }
  chain.reverse();
  let world = identityAff2();
  for (const transform of chain) {
    world = multiplyAff2(world, aff2FromTransform2D(transform));
  }
  return world;
}

export function getParentWorldAff2(
  scene: SceneData,
  parentId: string | undefined,
): Aff2 {
  if (!parentId) {
    return identityAff2();
  }
  return getWorldAff2(scene, parentId);
}

/**
 * Convert a world-space Transform2D into a local Transform2D under `parentId`
 * (root when undefined), preserving visual pose.
 */
export function worldTransformToLocal(
  scene: SceneData,
  parentId: string | undefined,
  worldTransform: Transform2DComponentData,
): Transform2DComponentData {
  const parentWorld = getParentWorldAff2(scene, parentId);
  const world = aff2FromTransform2D(worldTransform);
  const local = multiplyAff2(invertAff2(parentWorld), world);
  return decomposeAff2ToTransform2D(local, worldTransform.id);
}

export function applyAff2Point(m: Aff2, point: Vec2): Vec2 {
  return {
    x: m.a * point.x + m.c * point.y + m.tx,
    y: m.b * point.x + m.d * point.y + m.ty,
  };
}

/** Linear part only — use for world/local translation deltas, not points. */
export function applyAff2Vector(m: Aff2, vector: Vec2): Vec2 {
  return {
    x: m.a * vector.x + m.c * vector.y,
    y: m.b * vector.x + m.d * vector.y,
  };
}

/** World-space translation implied by a local-position change on `nodeId`. */
export function worldDeltaFromLocalPositions(
  scene: SceneData,
  nodeId: string,
  startLocal: Vec2,
  endLocal: Vec2,
): Vec2 {
  const parentId = findParentNode(scene, nodeId)?.id;
  const parentWorld = getParentWorldAff2(scene, parentId);
  return applyAff2Vector(parentWorld, {
    x: endLocal.x - startLocal.x,
    y: endLocal.y - startLocal.y,
  });
}

/**
 * Parent-local position after translating `nodeId` by a world-space delta.
 * Returns undefined when the node has no Transform2D.
 */
export function localPositionAfterWorldDelta(
  scene: SceneData,
  nodeId: string,
  worldDelta: Vec2,
): Vec2 | undefined {
  const node = findNodeById(scene, nodeId);
  const transform = node ? getTransform2D(node) : undefined;
  if (!transform) {
    return undefined;
  }
  const parentId = findParentNode(scene, nodeId)?.id;
  const localDelta = applyAff2Vector(
    invertAff2(getParentWorldAff2(scene, parentId)),
    worldDelta,
  );
  return {
    x: transform.position.x + localDelta.x,
    y: transform.position.y + localDelta.y,
  };
}

/** Convert a world-space point into the local space of `parentId` (or root). */
export function worldPointToLocal(
  scene: SceneData,
  parentId: string | undefined,
  worldPoint: Vec2,
): Vec2 {
  const parentWorld = getParentWorldAff2(scene, parentId);
  return applyAff2Point(invertAff2(parentWorld), worldPoint);
}
