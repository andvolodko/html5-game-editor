import { createId } from "@game-editor/shared";
import {
  SCENE_SCHEMA_VERSION,
  type SceneData,
  type SceneNodeData,
  type SpriteComponentData,
  type Transform2DComponentData,
  type Transform3DComponentData,
  type Vec2,
  type Vec3,
  type VisualComponentData,
} from "../types.js";
import type { ThreeComponentData } from "../three-components.js";
import { DEFAULT_NODE_SPAWN_POSITION } from "../defaults.js";
import { createSpriteComponent } from "./sprites.js";

export function createEmptyScene(
  name = "Untitled Scene",
  options?: { renderer?: "pixi" | "three" | "hybrid" },
): SceneData {
  const scene: SceneData = {
    id: createId("scene"),
    name,
    version: SCENE_SCHEMA_VERSION,
    nodes: [],
  };
  if (options?.renderer !== undefined) {
    scene.renderer = options.renderer;
  }
  return scene;
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

export function createTransform3D(
  partial?: Partial<Omit<Transform3DComponentData, "type" | "id">> & { id?: string },
): Transform3DComponentData {
  return {
    type: "Transform3D",
    id: partial?.id ?? createId("comp"),
    position: partial?.position ?? { x: 0, y: 0, z: 0 },
    rotation: partial?.rotation ?? { x: 0, y: 0, z: 0 },
    scale: partial?.scale ?? { x: 1, y: 1, z: 1 },
  };
}

/**
 * Map a 2D spawn / drop position onto the Three XZ plane (editor Vec2 → Vec3).
 * Scene panel drop uses screen→world Vec2; Three treats y as height (0).
 */
export function vec2ToVec3OnXZ(position: Vec2): Vec3 {
  return { x: position.x, y: 0, z: position.y };
}

/** Builds Transform3D + optional Three leaf (or Transform3D-only container). */
export function createNodeWithTransform3D(
  name: string,
  position: Vec3,
  three?: ThreeComponentData,
  parentId?: string,
): SceneNodeData {
  const node: SceneNodeData = {
    id: createId("node"),
    name,
    components: [
      createTransform3D({ position }),
      ...(three ? [three] : []),
    ],
    children: [],
  };
  if (parentId !== undefined) {
    node.parentId = parentId;
  }
  return node;
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
