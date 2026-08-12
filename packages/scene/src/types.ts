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



export {

  LEAF_VISUAL_COMPONENT_TYPES,

  isLeafVisualComponentType,

  DEFAULT_VISUAL_ANCHOR,

  visualComponentSupportsAnchor,

  getVisualAnchorOrDefault,

} from "./visual-components.js";



import type { VisualComponentData } from "./visual-components.js";



export type ComponentData =

  | Transform2DComponentData

  | Transform3DComponentData

  | VisualComponentData;



export interface SceneNodeData {

  id: string;

  name: string;

  parentId?: string;

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

  nodes: SceneNodeData[];

}



/** Current scene document schema version. Bump when persisted shape changes incompatibly. */

export const SCENE_SCHEMA_VERSION = 1 as const;


