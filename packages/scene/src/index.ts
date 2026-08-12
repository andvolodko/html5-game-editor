export type {

  Vec2,

  Vec3,

  Transform2DComponentData,

  Transform3DComponentData,

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

  ComponentData,

  SceneNodeData,

  SceneData,

} from "./types.js";

export {

  SCENE_SCHEMA_VERSION,

  LEAF_VISUAL_COMPONENT_TYPES,

  isLeafVisualComponentType,

  DEFAULT_VISUAL_ANCHOR,

  visualComponentSupportsAnchor,

  getVisualAnchorOrDefault,

} from "./types.js";

export {

  vec2Schema,

  vec3Schema,

  transform2DComponentSchema,

  transform3DComponentSchema,

  spriteComponentSchema,

  nineSliceSpriteComponentSchema,

  tilingSpriteComponentSchema,

  graphicsShapeSchema,

  graphicsComponentSchema,

  textStyleSchema,

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

  componentSchema,

  sceneNodeSchema,

  sceneDataSchema,

  parseSceneData,

  isCurrentSceneSchemaVersion,

} from "./schema.js";

export type { SceneRenderer } from "./scene-renderer.js";

export {

  createEmptyScene,

  createEmptyNode,

  createTransform2D,

  createDefaultTextStyle,

  createSpriteComponent,

  createNineSliceSpriteComponent,

  createTilingSpriteComponent,

  createGraphicsComponent,

  createTextComponent,

  createBitmapTextComponent,

  createHTMLTextComponent,

  createMeshComponent,

  createMeshSimpleComponent,

  createMeshRopeComponent,

  createMeshPlaneComponent,

  createPerspectiveMeshComponent,

  createAnimatedSpriteComponent,

  createSpineComponent,

  createSpriteNode,

  createNodeWithVisual,

} from "./factories.js";

export {

  findNodeById,

  getTransform2D,

  getSprite,

  getVisualComponent,

  getComponentByType,

  getNineSliceSprite,

  getTilingSprite,

  getGraphics,

  getText,

  getBitmapText,

  getHTMLText,

  getMesh,

  getMeshSimple,

  getMeshRope,

  getMeshPlane,

  getPerspectiveMesh,

  getAnimatedSprite,

  getSpine,

  flattenNodes,

  removeNodeById,

} from "./queries.js";

export {

  nodeCanHaveChildren,

  getLeafVisualComponent,

  getLeafVisualType,

  getNodeTypeId,

  visualTypeToNodeTypeId,

  getNodeTypeIcon,

} from "./node-capabilities.js";

export {

  getNodeLocation,

  findParentNode,

  isAncestorOf,

  canMoveNode,

  moveNodeInScene,

  getAncestorIds,

} from "./hierarchy.js";

export type { NodeLocation, MoveNodeResult } from "./hierarchy.js";

export {

  identityAff2,

  aff2FromTransform2D,

  multiplyAff2,

  invertAff2,

  decomposeAff2ToTransform2D,

  getWorldAff2,

  getParentWorldAff2,

  worldTransformToLocal,

  applyAff2Point,

  worldPointToLocal,

} from "./transform-math.js";

export type { Aff2 } from "./transform-math.js";

export {

  sizeFromHandleDrag,

  rotationFromHandleDrag,

  gizmoHandleLocalPosition,

  gizmoLocalFromAnchor,

  visualCenterFromAnchor,

  anchorFromGizmoLocal,

  positionDeltaForAnchorChange,

  sizeHandleCursor,

  isSpriteSizeHandle,

  isSpriteFlipHandle,

  isCornerHandle,

  normalizeRotationDegrees,

  SPRITE_SIZE_HANDLES,

  SPRITE_GIZMO_MIN_SIZE,

  SPRITE_GIZMO_ROTATE_OFFSET,

  SPRITE_GIZMO_FLIP_OFFSET,

  SPRITE_GIZMO_FLIP_GAP,

  SPRITE_GIZMO_FLIP_INSET,

  SPRITE_GIZMO_HANDLE_HIT_EXTENT,

  SPRITE_GIZMO_ROTATE_HIT_EXTENT,

  SPRITE_GIZMO_ANCHOR_HIT_EXTENT,

  spriteGizmoHitOutsets,

} from "./sprite-gizmo-math.js";

export type {

  SpriteGizmoHandle,

  SpriteSizeHandle,

} from "./sprite-gizmo-math.js";

export {

  cloneNodeSubtree,

  createContainerNode,

  insertNodeInScene,

  detachNodeFromScene,

  normalizeRootMostNodeIds,

  selectionAfterDelete,

  allocateDuplicateName,

  allocateNumberedName,

  collectNodeNames,

  flattenSubtree,

} from "./node-ops.js";

export { collectReferencedAssetIds } from "./asset-refs.js";

export {
  DEFAULT_NODE_SPAWN_POSITION,
  DEFAULT_SPRITE_SIZE,
  DEFAULT_NINE_SLICE_WIDTH,
  DEFAULT_NINE_SLICE_HEIGHT,
  DEFAULT_NINE_SLICE_BORDER,
  DEFAULT_TILING_SPRITE_SIZE,
  DEFAULT_TEXT_FONT_SIZE,
  DEFAULT_TEXT_FILL,
  DEFAULT_TEXT_WORD_WRAP_WIDTH,
  DEFAULT_GRAPHICS_SIZE,
  DEFAULT_GRAPHICS_FILL_COLOR,
  DEFAULT_GRAPHICS_STROKE_COLOR,
  DEFAULT_GRAPHICS_ROUNDED_RADIUS,
  DEFAULT_GRAPHICS_CIRCLE_RADIUS,
  DEFAULT_GRAPHICS_ELLIPSE_WIDTH,
  DEFAULT_GRAPHICS_ELLIPSE_HEIGHT,
  DEFAULT_GRAPHICS_TRIANGLE_EXTENT,
  DEFAULT_MESH_QUAD_HALF_EXTENT,
  DEFAULT_MESH_ROPE_SPAN,
  DEFAULT_MESH_PLANE_SIZE,
  DEFAULT_MESH_SUBDIVISIONS,
  DEFAULT_MESH_FALLBACK_SIZE,
  DEFAULT_MESH_ROPE_BOUNDS_PAD_Y,
  DEFAULT_MESH_ROPE_PLACEHOLDER_HEIGHT,
  DEFAULT_SPINE_TIME_SCALE,
} from "./defaults.js";


