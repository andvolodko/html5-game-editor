import {
  BASE_NODE_STATE_ID,
  resolveNodeState,
  type NodeStateId,
  type SceneData,
  type SceneNodeData,
  type SceneRenderer,
} from "@game-editor/scene";

/**
 * Apply Base + active state onto a live renderer without mutating authored Base.
 * Used by runtime `ctx.node.states` and mirrors editor overlay behaviour.
 */
export function applyRuntimeNodeStateDisplay(
  renderer: SceneRenderer,
  node: SceneNodeData,
  stateId: NodeStateId | typeof BASE_NODE_STATE_ID,
): void {
  const resolved = resolveNodeState(node, stateId);

  const transform = renderer.getRuntimeTransform2D?.(node.id);
  if (transform && resolved.transform2D) {
    transform.x = resolved.transform2D.position.x;
    transform.y = resolved.transform2D.position.y;
    transform.rotation = resolved.transform2D.rotation;
    transform.scaleX = resolved.transform2D.scale.x;
    transform.scaleY = resolved.transform2D.scale.y;
  }

  renderer.setNodeAlpha?.(node.id, resolved.alpha);

  if (renderer.setNodeResolvedVisible) {
    renderer.setNodeResolvedVisible(node.id, resolved.visible);
  } else {
    renderer.setNodeVisible?.(node.id, resolved.visible);
  }
}

/** Resolve catalog id from id or unique display name. */
export function resolveSceneStateId(
  scene: SceneData,
  stateIdOrName: string,
): NodeStateId | undefined {
  const catalog = scene.states ?? [];
  const byId = catalog.find((entry) => entry.id === stateIdOrName);
  if (byId) {
    return byId.id;
  }
  const matches = catalog.filter((entry) => entry.name === stateIdOrName);
  if (matches.length === 1) {
    return matches[0]!.id;
  }
  return undefined;
}
