import type { ComponentData, SceneNodeData } from "@game-editor/scene";

export function requireDocumentNode(
  node: SceneNodeData | undefined,
  nodeId: string,
): SceneNodeData {
  if (!node) {
    throw new Error(`DocumentManager: unknown node ${nodeId}`);
  }
  return node;
}

/**
 * Replace a component in-place (same array slot) after identity checks.
 * Used by visual / script / Three / HitZone / Mask apply* methods.
 */
export function replaceComponentInPlace(
  node: SceneNodeData,
  values: ComponentData,
  options: {
    find: (component: ComponentData) => boolean;
    missing: string;
    mismatch: string;
    validate?: (existing: ComponentData) => void;
  },
): void {
  const index = node.components.findIndex(options.find);
  const existing = index >= 0 ? node.components[index] : undefined;
  if (!existing) {
    throw new Error(options.missing);
  }
  if (existing.id !== values.id) {
    throw new Error(options.mismatch);
  }
  options.validate?.(existing);
  node.components[index] = structuredClone(values);
}
