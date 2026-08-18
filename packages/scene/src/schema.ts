import { z } from "zod";
import { SCENE_SCHEMA_VERSION, type SceneData, type SceneNodeData } from "./types.js";
import { withSceneParseDefaults } from "./scene-parse-defaults.js";
import { prefabInstanceLinkSchema } from "./prefab/link-schema.js";
import {
  TEXT_ALIGN_OPTIONS,
  TEXT_BASELINE_OPTIONS,
  TEXT_FONT_STYLE_OPTIONS,
  TEXT_FONT_VARIANT_OPTIONS,
  TEXT_FONT_WEIGHT_OPTIONS,
  TEXT_STROKE_JOIN_OPTIONS,
  TEXT_WHITE_SPACE_OPTIONS,
} from "./visual-components.js";

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
  skew: vec2Schema.optional(),
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
  fontAssetId: z.string().min(1).optional(),
  fontSize: z.number().positive(),
  fontWeight: z.enum(TEXT_FONT_WEIGHT_OPTIONS),
  fontStyle: z.enum(TEXT_FONT_STYLE_OPTIONS),
  fontVariant: z.enum(TEXT_FONT_VARIANT_OPTIONS),
  fill: z.union([
    z.number().int().nonnegative(),
    z.array(z.number().int().nonnegative()).min(1),
  ]),
  fillAlpha: z.number().min(0).max(1),
  align: z.enum(TEXT_ALIGN_OPTIONS),
  letterSpacing: z.number(),
  lineHeight: z.number().nonnegative(),
  leading: z.number(),
  wordWrap: z.boolean(),
  wordWrapWidth: z.number().positive(),
  breakWords: z.boolean(),
  whiteSpace: z.enum(TEXT_WHITE_SPACE_OPTIONS),
  padding: z.number().nonnegative(),
  trim: z.boolean(),
  textBaseline: z.enum(TEXT_BASELINE_OPTIONS),
  strokeColor: z.number().int().nonnegative(),
  strokeAlpha: z.number().min(0).max(1),
  strokeWidth: z.number().nonnegative(),
  strokeJoin: z.enum(TEXT_STROKE_JOIN_OPTIONS),
  miterLimit: z.number().positive(),
  dropShadow: z.boolean(),
  dropShadowColor: z.number().int().nonnegative(),
  dropShadowAlpha: z.number().min(0).max(1),
  dropShadowBlur: z.number().nonnegative(),
  dropShadowDistance: z.number().nonnegative(),
  dropShadowAngle: z.number(),
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
  assetId: z.string().min(1).optional(),
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
  assetId: z.string().min(1).optional(),
  animation: z.string().min(1).optional(),
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

export const tileChunkSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  tiles: z.array(z.number().int()),
}).superRefine((chunk, ctx) => {
  if (chunk.tiles.length !== chunk.width * chunk.height) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Tile chunk tiles length (${String(chunk.tiles.length)}) must equal width*height (${String(chunk.width * chunk.height)})`,
      path: ["tiles"],
    });
  }
});

export const tilemapLayerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  visible: z.boolean(),
  opacity: z.number().min(0).max(1),
  chunks: z.array(tileChunkSchema),
});

export const tilemapComponentSchema = z.object({
  type: z.literal("Tilemap"),
  id: z.string().min(1),
  tileSetId: z.string().min(1).optional(),
  tileWidth: z.number().positive(),
  tileHeight: z.number().positive(),
  layers: z.array(tilemapLayerSchema).min(1),
});

export const model3DComponentSchema = z.object({
  type: z.literal("Model3D"),
  id: z.string().min(1),
  assetId: z.string().min(1).optional(),
  animation: z.string().min(1).optional(),
  loop: z.boolean(),
  timeScale: z.number().positive(),
  playing: z.boolean(),
});

export const perspectiveCameraComponentSchema = z.object({
  type: z.literal("PerspectiveCamera"),
  id: z.string().min(1),
  fov: z.number().positive(),
  near: z.number().positive(),
  far: z.number().positive(),
  active: z.boolean().optional(),
});

export const directionalLightComponentSchema = z.object({
  type: z.literal("DirectionalLight"),
  id: z.string().min(1),
  color: z.number().int().nonnegative(),
  intensity: z.number().nonnegative(),
});

export const ambientLightComponentSchema = z.object({
  type: z.literal("AmbientLight"),
  id: z.string().min(1),
  color: z.number().int().nonnegative(),
  intensity: z.number().nonnegative(),
});

/** JSON-compatible property bag for Script components (no functions / undefined). */
export const scriptPropertyValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(scriptPropertyValueSchema),
    z.record(z.string(), scriptPropertyValueSchema),
  ]),
);

export const scriptComponentSchema = z.object({
  type: z.literal("Script"),
  id: z.string().min(1),
  scriptId: z.string().min(1),
  enabled: z.boolean().optional(),
  properties: z.record(z.string(), scriptPropertyValueSchema),
});

export const hitZoneComponentSchema = z.object({
  type: z.literal("HitZone"),
  id: z.string().min(1),
  enabled: z.boolean().optional(),
  offset: vec2Schema.optional(),
  shape: graphicsShapeSchema,
});

export const maskComponentSchema = z.object({
  type: z.literal("Mask"),
  id: z.string().min(1),
  enabled: z.boolean().optional(),
  inverse: z.boolean().optional(),
  offset: vec2Schema.optional(),
  mode: z.enum(["shape", "sprite"]),
  shape: graphicsShapeSchema.optional(),
  assetId: z.string().min(1).optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
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
  tilemapComponentSchema,
  model3DComponentSchema,
  perspectiveCameraComponentSchema,
  directionalLightComponentSchema,
  ambientLightComponentSchema,
  scriptComponentSchema,
  hitZoneComponentSchema,
  maskComponentSchema,
]).superRefine((value, ctx) => {
  if (value.type === "Mask" && value.mode === "shape" && value.shape === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Mask shape mode requires shape",
      path: ["shape"],
    });
  }
});

export const sceneNodeSchema: z.ZodType<SceneNodeData> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    parentId: z.string().min(1).optional(),
    layer: z.enum(["background", "foreground"]).optional(),
    visible: z.boolean().optional(),
    alpha: z.number().min(0).max(1).optional(),
    prefab: prefabInstanceLinkSchema.optional(),
    components: z.array(componentSchema),
    children: z.array(sceneNodeSchema),
  }),
);

export const sceneDataSchema: z.ZodType<SceneData> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.number().int().positive(),
  renderer: z.enum(["pixi", "three", "hybrid"]).optional(),
  nodes: z.array(sceneNodeSchema),
});

export function parseSceneData(input: unknown): SceneData {
  return sceneDataSchema.parse(withSceneParseDefaults(input));
}

export function isCurrentSceneSchemaVersion(version: number): boolean {
  return version === SCENE_SCHEMA_VERSION;
}
