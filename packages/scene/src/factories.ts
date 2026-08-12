import { createId } from "@game-editor/shared";
import { SCENE_SCHEMA_VERSION, type SceneData, type SceneNodeData } from "./types.js";

export function createEmptyScene(name = "Untitled Scene"): SceneData {
  return {
    id: createId("scene"),
    name,
    version: SCENE_SCHEMA_VERSION,
    nodes: [],
  };
}

export function createEmptyNode(name = "Node", parentId?: string): SceneNodeData {
  const node: SceneNodeData = {
    id: createId("node"),
    name,
    components: [],
    children: [],
  };

  if (parentId !== undefined) {
    node.parentId = parentId;
  }

  return node;
}
