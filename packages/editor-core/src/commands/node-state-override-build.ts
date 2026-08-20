import {
  BASE_NODE_STATE_ID,
  diffTransform2DOverride,
  getNodeAlpha,
  getNodeVisible,
  getTransform2D,
  pruneNodeStateOverrides,
  resetNodeStateProperty,
  resolveNodeState,
  type NodeStateId,
  type NodeStateOverrides,
  type NodeStatePropertyPath,
  type SceneNodeData,
  type Vec2,
} from "@game-editor/scene";
import type { Transform2DPatch } from "./set-transform-2d-command.js";

function cloneOverrides(
  overrides: NodeStateOverrides | undefined,
): NodeStateOverrides {
  return overrides
    ? (JSON.parse(JSON.stringify(overrides)) as NodeStateOverrides)
    : {};
}

function pruneProbe(
  node: SceneNodeData,
  stateId: NodeStateId,
  overrides: NodeStateOverrides,
): NodeStateOverrides | undefined {
  const probe: SceneNodeData = {
    id: node.id,
    name: node.name,
    components: node.components,
    children: [],
    stateOverrides: { [stateId]: overrides },
  };
  pruneNodeStateOverrides(probe);
  return probe.stateOverrides?.[stateId];
}

/**
 * Build the next sparse override bag after a Transform2D patch while a named
 * state is active. Only channels that differ from Base are stored.
 */
export function buildStateOverrideAfterTransformPatch(
  node: SceneNodeData,
  stateId: NodeStateId,
  patch: Transform2DPatch,
): NodeStateOverrides | undefined {
  const resolved = resolveNodeState(node, stateId);
  if (!resolved.transform2D) {
    return node.stateOverrides?.[stateId];
  }

  const nextPose = {
    position: patch.position
      ? { ...patch.position }
      : { ...resolved.transform2D.position },
    rotation:
      patch.rotation !== undefined
        ? patch.rotation
        : resolved.transform2D.rotation,
    scale: patch.scale ? { ...patch.scale } : { ...resolved.transform2D.scale },
  };

  const next = cloneOverrides(node.stateOverrides?.[stateId]);
  const transform2D = diffTransform2DOverride(getTransform2D(node), nextPose);
  if (transform2D === undefined) {
    delete next.transform2D;
  } else {
    next.transform2D = transform2D;
  }
  return pruneProbe(node, stateId, next);
}

export function buildStateOverrideAfterPosition(
  node: SceneNodeData,
  stateId: NodeStateId,
  position: Vec2,
): NodeStateOverrides | undefined {
  return buildStateOverrideAfterTransformPatch(node, stateId, { position });
}

export function buildStateOverrideAfterAlpha(
  node: SceneNodeData,
  stateId: NodeStateId,
  alpha: number,
): NodeStateOverrides | undefined {
  const next = cloneOverrides(node.stateOverrides?.[stateId]);
  if (alpha === getNodeAlpha(node)) {
    delete next.alpha;
  } else {
    next.alpha = alpha;
  }
  return pruneProbe(node, stateId, next);
}

export function buildStateOverrideAfterVisible(
  node: SceneNodeData,
  stateId: NodeStateId,
  visible: boolean,
): NodeStateOverrides | undefined {
  const next = cloneOverrides(node.stateOverrides?.[stateId]);
  if (visible === getNodeVisible(node)) {
    delete next.visible;
  } else {
    next.visible = visible;
  }
  return pruneProbe(node, stateId, next);
}

export function buildStateOverrideAfterResetProperty(
  node: SceneNodeData,
  stateId: NodeStateId,
  path: NodeStatePropertyPath,
): NodeStateOverrides | undefined {
  const existing = node.stateOverrides?.[stateId];
  if (!existing) {
    return undefined;
  }
  const next = cloneOverrides(existing);
  resetNodeStateProperty(next, path);
  return pruneProbe(node, stateId, next);
}

export function isEditingNamedNodeState(
  stateId: NodeStateId | typeof BASE_NODE_STATE_ID,
): stateId is NodeStateId {
  return stateId !== BASE_NODE_STATE_ID;
}
