import type { SceneNodeData } from "./types.js";
import {
  IDENTITY_NODE_ALPHA,
  NODE_ALPHA_MAX,
  NODE_ALPHA_MIN,
} from "./defaults.js";

/** Runtime/export opacity. Omitted `alpha` means fully opaque. */
export function getNodeAlpha(node: { alpha?: number }): number {
  return node.alpha ?? IDENTITY_NODE_ALPHA;
}

function clampNodeAlpha(alpha: number): number {
  return Math.min(NODE_ALPHA_MAX, Math.max(NODE_ALPHA_MIN, alpha));
}

/** Persist `alpha` when not identity; omit the field when fully opaque. */
export function setNodeAlphaField(node: SceneNodeData, alpha: number): void {
  const next = clampNodeAlpha(alpha);
  if (next === IDENTITY_NODE_ALPHA) {
    delete node.alpha;
    return;
  }
  node.alpha = next;
}

export function copyNodeAlpha(source: SceneNodeData, target: SceneNodeData): void {
  if (source.alpha !== undefined) {
    target.alpha = source.alpha;
  }
}
