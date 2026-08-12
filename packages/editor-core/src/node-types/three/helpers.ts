import type { SceneNodeData } from "@game-editor/scene";
import type { NodeTypeDefinition } from "../types.js";

export function withParent(
  node: SceneNodeData,
  parentId: string | undefined,
): SceneNodeData {
  if (parentId !== undefined) {
    node.parentId = parentId;
  } else {
    delete node.parentId;
  }
  return node;
}

export function def(
  partial: Omit<NodeTypeDefinition, "createDefaultNode" | "renderer"> & {
    createDefaultNode: NodeTypeDefinition["createDefaultNode"];
  },
): NodeTypeDefinition {
  return {
    ...partial,
    renderer: "three",
  };
}
