export type {
  Vec2,
  Vec3,
  Transform2DComponentData,
  Transform3DComponentData,
  ComponentData,
  SceneNodeData,
  SceneData,
} from "./types.js";
export { SCENE_SCHEMA_VERSION } from "./types.js";
export {
  vec2Schema,
  vec3Schema,
  transform2DComponentSchema,
  transform3DComponentSchema,
  componentSchema,
  sceneNodeSchema,
  sceneDataSchema,
  parseSceneData,
  isCurrentSceneSchemaVersion,
} from "./schema.js";
export type { SceneRenderer } from "./scene-renderer.js";
export { createEmptyScene, createEmptyNode } from "./factories.js";
