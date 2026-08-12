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

export const spriteComponentSchema = z.object({
  type: z.literal("Sprite"),
  id: z.string().min(1),
  assetId: z.string().min(1).optional(),
  width: z.number().positive(),
  height: z.number().positive(),
  anchor: vec2Schema.optional(),
  tint: z.number().int().nonnegative().optional(),
});

export const nineSliceSpriteComponentSchema = z.object({
  type: z.literal("NineSliceSprite"),
  id: z.string().min(1),
  assetId: z.string().min(1).optional(),
  width: z.number().positive(),
  height: z.number().positive(),
  leftWidth: z.number().nonnegative(),
  rightWidth: z.number().nonnegative(),
  topHeight: z.number().nonnegative(),
  bottomHeight: z.number().nonnegative(),
  tint: z.number().int().nonnegative().optional(),
});

export const tilingSpriteComponentSchema = z.object({
  type: z.literal("TilingSprite"),
  id: z.string().min(1),
  assetId: z.string().min(1).optional(),
  width: z.number().positive(),
  height: z.number().positive(),
  tilePosition: vec2Schema,
  tileScale: vec2Schema,
  tileRotation: z.number(),
  anchor: vec2Schema.optional(),
  tint: z.number().int().nonnegative().optional(),
});

export const graphicsShapeSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("rectangle"),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  z.object({
    type: z.literal("rounded-rectangle"),
    width: z.number().positive(),
    height: z.number().positive(),
    radius: z.number().nonnegative(),
  }),
  z.object({
    type: z.literal("circle"),
    radius: z.number().positive(),
  }),
  z.object({
    type: z.literal("ellipse"),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  z.object({
    type: z.literal("polygon"),
    points: z.array(vec2Schema).min(3),
  }),
]);

export const graphicsComponentSchema = z.object({
  type: z.literal("Graphics"),
  id: z.string().min(1),
  shape: graphicsShapeSchema,
  fillColor: z.number().int().nonnegative(),
  fillAlpha: z.number().min(0).max(1),
  strokeColor: z.number().int().nonnegative(),
  strokeAlpha: z.number().min(0).max(1),
  strokeWidth: z.number().nonnegative(),
});

export const textStyleSchema = z.object({
  fontFamily: z.string().min(1),
  fontSize: z.number().positive(),
  fontWeight: z.string().min(1),
  fontStyle: z.string().min(1),
  fill: z.number().int().nonnegative(),
  align: z.enum(["left", "center", "right"]),
  letterSpacing: z.number(),
  lineHeight: z.number().nonnegative(),
  wordWrap: z.boolean(),
  wordWrapWidth: z.number().positive(),
});

export const textComponentSchema = z.object({
  type: z.literal("Text"),
  id: z.string().min(1),
  text: z.string(),
  style: textStyleSchema,
  anchor: vec2Schema.optional(),
});

export const bitmapTextComponentSchema = z.object({
  type: z.literal("BitmapText"),
  id: z.string().min(1),
  text: z.string(),
  fontFamily: z.string().min(1).optional(),
  fontSize: z.number().positive(),
  align: z.enum(["left", "center", "right"]),
  letterSpacing: z.number(),
  tint: z.number().int().nonnegative().optional(),
  anchor: vec2Schema.optional(),
});

export const htmlTextComponentSchema = z.object({
  type: z.literal("HTMLText"),
  id: z.string().min(1),
  text: z.string(),
  style: textStyleSchema,
  anchor: vec2Schema.optional(),
});

const floatArraySchema = z.array(z.number());

export const meshSimpleComponentSchema = z.object({
  type: z.literal("MeshSimple"),
  id: z.string().min(1),
  assetId: z.string().min(1).optional(),
  vertices: floatArraySchema.min(6),
  uvs: floatArraySchema.min(6),
  indices: floatArraySchema.min(3),
  autoUpdate: z.boolean(),
});

export const meshRopeComponentSchema = z.object({
  type: z.literal("MeshRope"),
  id: z.string().min(1),
  assetId: z.string().min(1).optional(),
  points: z.array(vec2Schema).min(2),
  textureScale: z.number().positive(),
  autoUpdate: z.boolean(),
});

export const meshPlaneComponentSchema = z.object({
  type: z.literal("MeshPlane"),
  id: z.string().min(1),
  assetId: z.string().min(1).optional(),
  width: z.number().positive(),
  height: z.number().positive(),
  verticesX: z.number().int().min(2),
  verticesY: z.number().int().min(2),
});

export const perspectiveMeshComponentSchema = z.object({
  type: z.literal("PerspectiveMesh"),
  id: z.string().min(1),
  assetId: z.string().min(1).optional(),
  width: z.number().positive(),
  height: z.number().positive(),
  verticesX: z.number().int().min(2),
  verticesY: z.number().int().min(2),
  corners: z.tuple([vec2Schema, vec2Schema, vec2Schema, vec2Schema]),
});

export const meshComponentSchema = z.object({
  type: z.literal("Mesh"),
  id: z.string().min(1),
  assetId: z.string().min(1).optional(),
  vertices: floatArraySchema.min(6),
  uvs: floatArraySchema.min(6),
  indices: floatArraySchema.min(3),
});

export const animatedSpriteComponentSchema = z.object({
  type: z.literal("AnimatedSprite"),
  id: z.string().min(1),
  frames: z.array(z.string().min(1)),
  animationSpeed: z.number().positive(),
  loop: z.boolean(),
  playing: z.boolean(),
  anchor: vec2Schema.optional(),
  tint: z.number().int().nonnegative().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

export const spineComponentSchema = z.object({
  type: z.literal("Spine"),
  id: z.string().min(1),
  assetId: z.string().min(1).optional(),
  skin: z.string().min(1).optional(),
  animation: z.string().min(1).optional(),
  loop: z.boolean(),
  timeScale: z.number().positive(),
  playing: z.boolean(),
});

export const componentSchema = z.discriminatedUnion("type", [
  transform2DComponentSchema,
  transform3DComponentSchema,
  spriteComponentSchema,
  nineSliceSpriteComponentSchema,
  tilingSpriteComponentSchema,
  graphicsComponentSchema,
  textComponentSchema,
  bitmapTextComponentSchema,
  htmlTextComponentSchema,
  meshComponentSchema,
  meshSimpleComponentSchema,
  meshRopeComponentSchema,
  meshPlaneComponentSchema,
  perspectiveMeshComponentSchema,
  animatedSpriteComponentSchema,
  spineComponentSchema,
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
