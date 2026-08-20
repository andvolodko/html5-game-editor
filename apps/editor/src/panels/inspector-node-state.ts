import {
  BASE_NODE_STATE_ID,
  isNodeStatePropertyOverridden,
  resolveNodeState,
  type NodeStateId,
  type NodeStatePropertyPath,
  type SceneNodeData,
} from "@game-editor/scene";

export type Transform2DDraftKey =
  | "x"
  | "y"
  | "rotation"
  | "scaleX"
  | "scaleY";

const TRANSFORM_DRAFT_TO_STATE_PATH: Record<
  Transform2DDraftKey,
  NodeStatePropertyPath
> = {
  x: "transform2D.position.x",
  y: "transform2D.position.y",
  rotation: "transform2D.rotation",
  scaleX: "transform2D.scale.x",
  scaleY: "transform2D.scale.y",
};

export function transformDraftKeyToStatePath(
  key: Transform2DDraftKey,
): NodeStatePropertyPath {
  return TRANSFORM_DRAFT_TO_STATE_PATH[key];
}

export function isInspectorStatePropertyOverridden(
  node: SceneNodeData,
  stateId: NodeStateId | typeof BASE_NODE_STATE_ID,
  path: NodeStatePropertyPath,
): boolean {
  return isNodeStatePropertyOverridden(node, stateId, path);
}

/** Effective Transform2D pose for Inspector drafts (Base + active state). */
export function getInspectorEffectiveTransform2D(
  node: SceneNodeData,
  stateId: NodeStateId | typeof BASE_NODE_STATE_ID,
): {
  position: { x: number; y: number };
  rotation: number;
  scale: { x: number; y: number };
} | undefined {
  return resolveNodeState(node, stateId).transform2D;
}

export function getInspectorEffectiveVisible(
  node: SceneNodeData,
  stateId: NodeStateId | typeof BASE_NODE_STATE_ID,
): boolean {
  return resolveNodeState(node, stateId).visible;
}

export function getInspectorEffectiveAlpha(
  node: SceneNodeData,
  stateId: NodeStateId | typeof BASE_NODE_STATE_ID,
): number {
  return resolveNodeState(node, stateId).alpha;
}
