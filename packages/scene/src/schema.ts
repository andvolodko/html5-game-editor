import { z } from "zod";
import { SCENE_SCHEMA_VERSION, type SceneData, type SceneNodeData } from "./types.js";

export const vec2Schema = z.object({
  x: z.number(),
  y: z.number(),
});

export const vec3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export const transform2DComponentSchema = z.object({
  type: z.literal("Transform2D"),
  id: z.string().min(1),
  position: vec2Schema,
  rotation: z.number(),
  scale: vec2Schema,
  anchor: vec2Schema.optional(),
});

export const transform3DComponentSchema = z.object({
  type: z.literal("Transform3D"),
  id: z.string().min(1),
  position: vec3Schema,
  rotation: vec3Schema,
  scale: vec3Schema,
});

export const componentSchema = z.discriminatedUnion("type", [
  transform2DComponentSchema,
  transform3DComponentSchema,
]);

export const sceneNodeSchema: z.ZodType<SceneNodeData> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    parentId: z.string().min(1).optional(),
    components: z.array(componentSchema),
    children: z.array(sceneNodeSchema),
  }),
);

export const sceneDataSchema: z.ZodType<SceneData> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.number().int().positive(),
  nodes: z.array(sceneNodeSchema),
});

export function parseSceneData(input: unknown): SceneData {
  return sceneDataSchema.parse(input);
}

export function isCurrentSceneSchemaVersion(version: number): boolean {
  return version === SCENE_SCHEMA_VERSION;
}
