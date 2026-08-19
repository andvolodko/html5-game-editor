import type { PrefabInstanceLink } from "./prefab/types.js";
import type { NodePointerEventMode } from "./node-pointer.js";

export type {
  PrefabInstanceLink,
  PrefabOverride,
  PrefabPropertyOverride,
  PrefabNameOverride,
  PrefabLayerOverride,
  PrefabVisibleOverride,
  PrefabAlphaOverride,
  PrefabPointerEventModeOverride,
  PrefabCursorOverride,
  PrefabPointerChildrenOverride,
  PrefabData,
} from "./prefab/types.js";

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

  /** Skew in degrees (engine-neutral; renderer converts to radians). Omitted = none. */
  skew?: Vec2;

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

  TextStyleFill,

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

  TilemapComponentData,

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

  defaultVisualDisplaySize,

  getVisualDisplaySize,

  getVisualAnchorOrDefault,

  TEXT_ALIGN_OPTIONS,

  TEXT_FONT_WEIGHT_OPTIONS,

  TEXT_FONT_STYLE_OPTIONS,

  TEXT_FONT_VARIANT_OPTIONS,

  TEXT_WHITE_SPACE_OPTIONS,

  TEXT_BASELINE_OPTIONS,

  TEXT_STROKE_JOIN_OPTIONS,

  textStyleFillStops,

  compactTextStyleFill,

} from "./visual-components.js";

export {
  LEAF_THREE_COMPONENT_TYPES,
  isLeafThreeComponentType,
  isThreeComponentType,
} from "./three-components.js";

import type { VisualComponentData } from "./visual-components.js";
import type { ThreeComponentData } from "./three-components.js";
import type { HitZoneComponentData } from "./hit-zone-component.js";
import type { MaskComponentData } from "./mask-component.js";

export type { HitZoneComponentData } from "./hit-zone-component.js";
export type { MaskComponentData, MaskMode } from "./mask-component.js";

/**
 * User/script component instance. `scriptId` is a stable registry id
 * (e.g. `shared.ChangeScene`), never a filesystem path.
 * Unknown scriptIds still deserialize; missing definitions warn in the editor.
 */
export interface ScriptComponentData {
  type: "Script";
  id: string;
  scriptId: string;
  /**
   * Runtime execution. Omitted means enabled (`true`). Persist `false` when
   * the behaviour should not be constructed or ticked.
   */
  enabled?: boolean;
  properties: Record<string, unknown>;
}

export type ComponentData =
  | Transform2DComponentData
  | Transform3DComponentData
  | VisualComponentData
  | ThreeComponentData
  | HitZoneComponentData
  | MaskComponentData
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

  /**
   * Runtime/export visibility of the display object.
   * Omitted means visible (`true`). Persist `false` when hidden.
   * Independent of editor-only Hierarchy hide.
   */
  visible?: boolean;

  /**
   * Runtime/export opacity of the display object (0–1).
   * Omitted means fully opaque (`1`). Persist when not `1`.
   */
  alpha?: number;

  /**
   * Playback pointer hit-testing mode (Pixi `eventMode`).
   * Omitted means `"static"`. Editor selection ignores this field.
   */
  pointerEventMode?: NodePointerEventMode;

  /**
   * CSS cursor on hover in playback / runtime.
   * Omitted means engine default. Editor grab cursor ignores this field.
   */
  cursor?: string;

  /**
   * Whether child nodes receive pointer events in playback.
   * Omitted means true. Persist `false` to block children.
   */
  pointerChildren?: boolean;

  /**
   * Present on nodes that belong to a prefab instance.
   * Omitted on ordinary scene nodes and local children.
   */
  prefab?: PrefabInstanceLink;

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


