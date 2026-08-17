import type { SceneNodeData } from "./types.js";

/** Runtime/export visibility. Omitted `visible` means true. */
export function getNodeVisible(node: { visible?: boolean }): boolean {
  return node.visible !== false;
}

/** Persist `visible: false`; omit the field when true (Git-friendly default). */
export function setNodeVisibleField(node: SceneNodeData, visible: boolean): void {
  if (visible) {
    delete node.visible;
  } else {
    node.visible = false;
  }
}

export function copyNodeVisible(source: SceneNodeData, target: SceneNodeData): void {
  if (source.visible !== undefined) {
    target.visible = source.visible;
  }
}
