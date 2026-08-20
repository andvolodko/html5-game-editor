import {
  BASE_NODE_STATE_ID,
  resolveNodeState,
  type NodeStateId,
  type SceneNodeData,
  type SceneRenderer,
} from "@game-editor/scene";

/**
 * Apply Base + active state onto a live renderer without replacing `runtime.node`.
 * Pose uses the live Transform2D handle; alpha/visible use renderer overlays.
 *
 * `resolvedVisible` is combined with editor hide by the caller via
 * `setNodeResolvedVisible` when available, otherwise `setNodeVisible`.
 */
export function applyResolvedNodeStateDisplay(
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
