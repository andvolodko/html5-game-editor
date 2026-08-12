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
  properties: z.record(z.string(), scriptPropertyValueSchema),
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
  model3DComponentSchema,
  perspectiveCameraComponentSchema,
  directionalLightComponentSchema,
  ambientLightComponentSchema,
  scriptComponentSchema,
]);

export const sceneNodeSchema: z.ZodType<SceneNodeData> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    parentId: z.string().min(1).optional(),
    layer: z.enum(["background", "foreground"]).optional(),
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
  return sceneDataSchema.parse(withModel3DPlaybackDefaults(input));
}

/**
 * Older Model3D entries may omit playback fields. Fill defaults before Zod
 * so the schema can keep loop/timeScale/playing required (matches TS types).
 */
function withModel3DPlaybackDefaults(input: unknown): unknown {
  if (!input || typeof input !== "object") {
    return input;
  }
  const scene = input as { nodes?: unknown };
  if (!Array.isArray(scene.nodes)) {
    return input;
  }
  return {
    ...scene,
    nodes: scene.nodes.map((node) => patchModel3DNodeTree(node)),
  };
}

function patchModel3DNodeTree(node: unknown): unknown {
  if (!node || typeof node !== "object") {
    return node;
  }
  const n = node as {
    components?: unknown[];
    children?: unknown[];
  };
  const components = Array.isArray(n.components)
    ? n.components.map((comp) => {
        if (!comp || typeof comp !== "object") {
          return comp;
        }
        const c = comp as Record<string, unknown>;
        if (c.type !== "Model3D") {
          return comp;
        }
        return {
          ...c,
          loop: typeof c.loop === "boolean" ? c.loop : true,
          timeScale:
            typeof c.timeScale === "number" && c.timeScale > 0
              ? c.timeScale
              : 1,
          playing: typeof c.playing === "boolean" ? c.playing : true,
        };
      })
    : n.components;
  const children = Array.isArray(n.children)
    ? n.children.map((child) => patchModel3DNodeTree(child))
    : n.children;
  return { ...n, components, children };
}

export function isCurrentSceneSchemaVersion(version: number): boolean {
  return version === SCENE_SCHEMA_VERSION;
}
