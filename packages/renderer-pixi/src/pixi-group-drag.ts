import type { Container, Matrix } from "pixi.js";
import type { Vec2 } from "@game-editor/scene";

export interface FrozenParentSpace {
  /** Parent-local → scene-world, captured at pointer-down. */
  parentToWorld: Matrix;
  startLocal: Vec2;
  startWorld: Vec2;
}

/**
 * Root-most selected nodes that can move with a viewport drag.
 * If the grabbed node is not selected, only that node is considered.
 */
export function collectGroupDragMemberIds(input: {
  grabbedId: string;
  selectedIds: readonly string[];
  getParentId: (id: string) => string | undefined;
  canMove: (id: string) => boolean;
}): string[] {
  const pool = input.selectedIds.includes(input.grabbedId)
    ? input.selectedIds
    : [input.grabbedId];
  const unique = [...new Set(pool)];
  return unique.filter((id) => {
    if (!input.canMove(id)) {
      return false;
    }
    let ancestorId = input.getParentId(id);
    while (ancestorId) {
      if (unique.includes(ancestorId) && input.canMove(ancestorId)) {
        return false;
      }
      ancestorId = input.getParentId(ancestorId);
    }
    return true;
  });
}

/** Scene-world point from a stage/screen position. */
export function screenToWorld(world: Container, screen: Vec2): Vec2 {
  const out = world.worldTransform.applyInverse({ x: screen.x, y: screen.y });
  return { x: out.x, y: out.y };
}

/**
 * Matrix mapping parent-local points into `world` local space.
 * Capture once at pointer-down so ancestor previews cannot double-apply.
 */
export function parentLocalToWorldMatrix(
  world: Container,
  parent: Container,
): Matrix {
  const matrix = world.worldTransform.clone().invert();
  matrix.append(parent.worldTransform);
  return matrix;
}

export function applyMatrixPoint(matrix: Matrix, point: Vec2): Vec2 {
  const out = matrix.apply({ x: point.x, y: point.y });
  return { x: out.x, y: out.y };
}

export function applyMatrixInversePoint(matrix: Matrix, point: Vec2): Vec2 {
  const out = matrix.applyInverse({ x: point.x, y: point.y });
  return { x: out.x, y: out.y };
}

export function captureFrozenParentSpace(
  world: Container,
  parent: Container,
  startLocal: Vec2,
): FrozenParentSpace {
  const parentToWorld = parentLocalToWorldMatrix(world, parent);
  return {
    parentToWorld,
    startLocal: { ...startLocal },
    startWorld: applyMatrixPoint(parentToWorld, startLocal),
  };
}

export function localAfterWorldDelta(
  space: FrozenParentSpace,
  worldDelta: Vec2,
): Vec2 {
  return applyMatrixInversePoint(space.parentToWorld, {
    x: space.startWorld.x + worldDelta.x,
    y: space.startWorld.y + worldDelta.y,
  });
}
