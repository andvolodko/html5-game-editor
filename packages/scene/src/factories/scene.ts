import { createId } from "@game-editor/shared";
import {
  SCENE_SCHEMA_VERSION,
  type SceneData,
  type SceneNodeData,
  type SpriteComponentData,
  type Transform2DComponentData,
  type Vec2,
  type VisualComponentData,
} from "../types.js";
import { DEFAULT_NODE_SPAWN_POSITION } from "../defaults.js";
import { createSpriteComponent } from "./sprites.js";

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

export function createTransform2D(
  partial?: Partial<Omit<Transform2DComponentData, "type" | "id">> & { id?: string },
): Transform2DComponentData {
  return {
    type: "Transform2D",
    id: partial?.id ?? createId("comp"),
    position: partial?.position ?? { x: 0, y: 0 },
    rotation: partial?.rotation ?? 0,
    scale: partial?.scale ?? { x: 1, y: 1 },
    ...(partial?.anchor !== undefined ? { anchor: partial.anchor } : {}),
  };
}

/** Creates a root sprite node with Transform2D + Sprite components. */
export function createSpriteNode(
  name = "Sprite",
  position: Vec2 = { ...DEFAULT_NODE_SPAWN_POSITION },
  sprite?: Partial<Omit<SpriteComponentData, "type" | "id">>,
): SceneNodeData {
  return createNodeWithVisual(
    name,
    position,
    createSpriteComponent(sprite),
  );
}

/** Builds Transform2D + visual leaf (or Transform2D-only when visual omitted). */
export function createNodeWithVisual(
  name: string,
  position: Vec2,
  visual?: VisualComponentData,
  parentId?: string,
): SceneNodeData {
  const node: SceneNodeData = {
    id: createId("node"),
    name,
    components: [
      createTransform2D({ position }),
      ...(visual ? [visual] : []),
    ],
    children: [],
  };
  if (parentId !== undefined) {
    node.parentId = parentId;
  }
  return node;
}
