export interface Vec2 {

  x: number;

  y: number;

}



export interface Vec3 {

  x: number;

  y: number;

  z: number;

}



export interface Transform2DComponentData {

  type: "Transform2D";

  id: string;

  position: Vec2;

  rotation: number;

  scale: Vec2;

  anchor?: Vec2;

}



export interface Transform3DComponentData {

  type: "Transform3D";

  id: string;

  position: Vec3;

  rotation: Vec3;

  scale: Vec3;

}



export type {

  SpriteComponentData,

  NineSliceSpriteComponentData,

  TilingSpriteComponentData,

  GraphicsShapeData,

  GraphicsComponentData,

  TextStyleData,

  TextAlign,

  TextFontWeight,

  TextFontStyle,

  TextFontVariant,

  TextWhiteSpace,

  TextBaseline,

  TextStrokeJoin,

  TextComponentData,

  BitmapTextComponentData,

  HTMLTextComponentData,

  MeshComponentData,

  MeshSimpleComponentData,

  MeshRopeComponentData,

  MeshPlaneComponentData,

  PerspectiveMeshComponentData,

  AnimatedSpriteComponentData,

  SpineComponentData,

  VisualComponentData,

  LeafVisualComponentType,

} from "./visual-components.js";

export type {
  Model3DComponentData,
  PerspectiveCameraComponentData,
  DirectionalLightComponentData,
  AmbientLightComponentData,
  ThreeComponentData,
  LeafThreeComponentType,
} from "./three-components.js";

export {
  LEAF_VISUAL_COMPONENT_TYPES,

  isLeafVisualComponentType,

  DEFAULT_VISUAL_ANCHOR,

  visualComponentSupportsAnchor,

  visualComponentSupportsDisplaySize,

  getVisualDisplaySize,

  getVisualAnchorOrDefault,

  TEXT_ALIGN_OPTIONS,

  TEXT_FONT_WEIGHT_OPTIONS,

  TEXT_FONT_STYLE_OPTIONS,

  TEXT_FONT_VARIANT_OPTIONS,

  TEXT_WHITE_SPACE_OPTIONS,

  TEXT_BASELINE_OPTIONS,

  TEXT_STROKE_JOIN_OPTIONS,

} from "./visual-components.js";

export {
  LEAF_THREE_COMPONENT_TYPES,
  isLeafThreeComponentType,
  isThreeComponentType,
} from "./three-components.js";

import type { VisualComponentData } from "./visual-components.js";
import type { ThreeComponentData } from "./three-components.js";

/**
 * User/script component instance. `scriptId` is a stable registry id
 * (e.g. `shared.ChangeScene`), never a filesystem path.
 * Unknown scriptIds still deserialize; missing definitions warn in the editor.
 */
export interface ScriptComponentData {
  type: "Script";
  id: string;
  scriptId: string;
  properties: Record<string, unknown>;
}

export type ComponentData =
  | Transform2DComponentData
  | Transform3DComponentData
  | VisualComponentData
  | ThreeComponentData
  | ScriptComponentData;



export interface SceneNodeData {

  id: string;

  name: string;

  parentId?: string;

  /**
   * Hybrid 2D stack slot (Pixi under vs over Three).
   * Ignored for Transform3D nodes. Default `"background"`.
   */
  layer?: "background" | "foreground";

  components: ComponentData[];

  children: SceneNodeData[];

}



/**

 * Renderer-independent serialized scene. Must never contain PIXI.* or THREE.* objects.

 */

export interface SceneData {

  id: string;

  name: string;

  /** Persisted schema / format version. */

  version: number;

  /**
   * Active viewport renderer for this scene.
   * Omitted / undefined defaults to `"pixi"`.
   * `"hybrid"` stacks Pixi background → Three → Pixi foreground.
   */
  renderer?: "pixi" | "three" | "hybrid";

  nodes: SceneNodeData[];

}



/** Current scene document schema version. Bump when persisted shape changes incompatibly. */

export const SCENE_SCHEMA_VERSION = 1 as const;


