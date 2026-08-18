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

  Model3DComponentData,

  PerspectiveCameraComponentData,

  DirectionalLightComponentData,

  AmbientLightComponentData,

  ThreeComponentData,

  LeafThreeComponentType,

  ScriptComponentData,

  HitZoneComponentData,

  MaskComponentData,

  MaskMode,

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

  LEAF_THREE_COMPONENT_TYPES,

  isLeafThreeComponentType,

  isThreeComponentType,

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

  tilemapComponentSchema,

  model3DComponentSchema,

  perspectiveCameraComponentSchema,

  directionalLightComponentSchema,

  ambientLightComponentSchema,

  scriptPropertyValueSchema,

  scriptComponentSchema,

  hitZoneComponentSchema,

  componentSchema,

  sceneNodeSchema,

  sceneDataSchema,

  parseSceneData,

  isCurrentSceneSchemaVersion,

} from "./schema.js";

export type { SceneRenderer, SceneRenderStats, BoneWorldTransform } from "./scene-renderer.js";
export {
  EMPTY_SCENE_RENDER_STATS,
  addSceneRenderStats,
} from "./scene-renderer.js";

export {

  createEmptyScene,

  createEmptyNode,

  createTransform2D,

  createTransform3D,

  vec2ToVec3OnXZ,

  createDefaultTextStyle,

  applyTextStyleWebFont,

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

  createTilemapComponent,

  createModel3DComponent,

  createPerspectiveCameraComponent,

  createDirectionalLightComponent,

  createAmbientLightComponent,

  createScriptComponent,

  createHitZoneComponent,

  createHitZoneNode,

  defaultHitZoneShapeForNode,

  createMaskComponent,

  createMaskNode,

  defaultMaskShapeForNode,

  createSpriteNode,

  createNodeWithVisual,

  createNodeWithTransform3D,

} from "./factories.js";

export {

  findNodeById,

  findNodeByName,

  getTransform2D,

  getTransform3D,

  getSprite,

  getVisualComponent,

  getComponentByType,

  getNineSliceSprite,

  getTilingSprite,

  getGraphics,

  getHitZone,

  getMask,

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

  getTilemap,

  getModel3D,

  getPerspectiveCamera,

  getDirectionalLight,

  getAmbientLight,

  getScriptComponents,

  findScript,

  flattenNodes,

  removeNodeById,

} from "./queries.js";

export {

  nodeCanHaveChildren,

  getLeafVisualComponent,

  getLeafVisualType,

  getLeafThreeComponent,

  getLeafThreeType,

  getNodeTypeId,

  visualTypeToNodeTypeId,

  threeTypeToNodeTypeId,

  getNodeTypeIcon,

} from "./node-capabilities.js";

export {
  getSceneRendererKind,
  getNodeLayer,
  getNodeTransformSpace,
  canParentAcrossTransformSpace,
  nodeBelongsToPixiBackground,
  nodeBelongsToPixiForeground,
  nodeBelongsToThree,
  nodeBelongsToPixi,
} from "./scene-layers.js";
export type {
  SceneNodeLayer,
  SceneRendererKind,
  NodeTransformSpace,
} from "./scene-layers.js";

export {
  getNodeVisible,
  setNodeVisibleField,
  copyNodeVisible,
} from "./node-visibility.js";
export { isScriptEnabled, setScriptEnabledField } from "./script-enabled.js";
export {
  getNodeAlpha,
  setNodeAlphaField,
  copyNodeAlpha,
} from "./node-alpha.js";

export { MultiSceneRenderer } from "./multi-scene-renderer.js";
export type { MultiSceneRendererSlot } from "./multi-scene-renderer.js";

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

  aff2FromPose,

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

export {
  EMPTY_TILE,
  TILEMAP_CHUNK_SIZE,
  DEFAULT_TILEMAP_LAYER_NAME,
  chunkCoord,
  chunkLocalCoord,
  chunkKey,
  chunkCellCount,
  isChunkEmpty,
} from "./tilemap-data.js";
export type {
  TileChunkData,
  TilemapLayerData,
  TileChange,
} from "./tilemap-data.js";
export {
  getTilemapLayer,
  primaryTilemapLayer,
  getTile,
  setTile,
  eraseTile,
  applyTileChanges,
  pruneEmptyTilemapChunks,
  occupiedTileBounds,
  tilemapLocalBounds,
  createDefaultTilemapLayer,
} from "./tilemap.js";
export type { OccupiedTileBounds } from "./tilemap.js";
export {
  tilemapChunkRenderKey,
  collectAnimatedTileUsage,
  chunksForChangedLogicalTiles,
} from "./tilemap-animation-usage.js";
export {
  worldToTile,
  tileToWorld,
  localToTile,
  tileToLocal,
  tileToLocalCenter,
  screenToTile,
} from "./tilemap-coords.js";

export type { Aff2 } from "./transform-math.js";

export { transformLocalAabb, unionLocalAabb } from "./local-aabb.js";

export type { LocalAabb } from "./local-aabb.js";
export { collectSceneContentBounds2D } from "./content-bounds-2d.js";

export {
  isHitZoneEnabled,
  getHitZoneOffset,
  defaultGraphicsShape,
  defaultHitZoneShapeFromVisual,
  hitZoneLocalAabb,
  localPointHitsHitZone,
  hitZoneSupportsSizeHandles,
  HIT_ZONE_POLYGON_MIN_POINTS,
  isHitZonePolygon,
  setHitZonePolygonPoint,
  insertHitZonePolygonPointOnEdge,
  removeHitZonePolygonPoint,
  hitZoneShapeSize,
  applySizeToHitZoneShape,
  hitZoneSizeFromHandleDrag,
} from "./hit-zone-math.js";

export {
  isMaskEnabled,
  isMaskInverse,
  getMaskOffset,
  getMaskShape,
  getMaskSpriteSize,
  maskAsHitZone,
  maskLocalAabb,
} from "./mask.js";

export {

  sizeFromHandleDrag,

  rotationFromHandleDrag,

  gizmoHandleLocalPosition,

  gizmoLocalFromAnchor,

  visualCenterFromAnchor,

  anchorFromGizmoLocal,

  positionDeltaForAnchorChange,

  sizeHandleCursor,

  scaleHandleCursor,

  isSpriteSizeHandle,

  isSpriteScaleHandle,

  isSpriteFlipHandle,

  isCornerHandle,

  normalizeRotationDegrees,

  scaleFromAxisDrag,

  SPRITE_SIZE_HANDLES,

  SPRITE_SCALE_HANDLES,

  SPRITE_GIZMO_MIN_SIZE,

  SPRITE_GIZMO_MIN_SCALE,

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

  SpriteScaleHandle,

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

export {
  collectReferencedAssetIds,
  collectNodeReferencedAssetIds,
  collectPrefabDocumentAssetIds,
} from "./asset-refs.js";

export {
  IDENTITY_POSITION_2D,
  IDENTITY_ROTATION_2D,
  IDENTITY_SCALE_2D,
  IDENTITY_SKEW_2D,
  IDENTITY_NODE_ALPHA,
  NODE_ALPHA_MIN,
  NODE_ALPHA_MAX,
  IDENTITY_POSITION_3D,
  IDENTITY_ROTATION_3D,
  IDENTITY_SCALE_3D,
  DEFAULT_NODE_SPAWN_POSITION,
  DEFAULT_NODE_SPAWN_POSITION_3D,
  DEFAULT_SPRITE_SIZE,
  DEFAULT_TILE_SIZE,
  DEFAULT_TILEMAP_EMPTY_EXTENT_TILES,
  DEFAULT_NINE_SLICE_WIDTH,
  DEFAULT_NINE_SLICE_HEIGHT,
  DEFAULT_NINE_SLICE_BORDER,
  DEFAULT_TILING_SPRITE_SIZE,
  DEFAULT_TEXT_FONT_FAMILY,
  DEFAULT_TEXT_FONT_SIZE,
  DEFAULT_TEXT_FILL,
  DEFAULT_TEXT_FILL_ALPHA,
  DEFAULT_TEXT_WORD_WRAP_WIDTH,
  DEFAULT_TEXT_STROKE_COLOR,
  DEFAULT_TEXT_STROKE_ALPHA,
  DEFAULT_TEXT_PADDING,
  DEFAULT_TEXT_MITER_LIMIT,
  DEFAULT_TEXT_DROP_SHADOW_COLOR,
  DEFAULT_TEXT_DROP_SHADOW_ALPHA,
  DEFAULT_TEXT_DROP_SHADOW_DISTANCE,
  DEFAULT_TEXT_DROP_SHADOW_ANGLE_DEGREES,
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
  DEFAULT_MODEL3D_TIME_SCALE,
  DEFAULT_PERSPECTIVE_CAMERA_FOV,
  DEFAULT_PERSPECTIVE_CAMERA_NEAR,
  DEFAULT_PERSPECTIVE_CAMERA_FAR,
  DEFAULT_DIRECTIONAL_LIGHT_COLOR,
  DEFAULT_DIRECTIONAL_LIGHT_INTENSITY,
  DEFAULT_AMBIENT_LIGHT_COLOR,
  DEFAULT_AMBIENT_LIGHT_INTENSITY,
} from "./defaults.js";

export type {
  PrefabPropertyOverride,
  PrefabNameOverride,
  PrefabLayerOverride,
  PrefabVisibleOverride,
  PrefabAlphaOverride,
  PrefabOverride,
  PrefabInstanceLink,
  PrefabData,
  PrefabCatalog,
  PrefabResolveWarningCode,
  PrefabResolveWarning,
  PrefabResolveResult,
  InstantiatePrefabOptions,
  InstantiatePrefabResult,
  CreatePrefabFromSubtreeResult,
} from "./prefab/index.js";
export {
  PREFAB_SCHEMA_VERSION,
  PREFAB_MAX_NESTING_DEPTH,
  prefabPropertyOverrideSchema,
  prefabNameOverrideSchema,
  prefabLayerOverrideSchema,
  prefabVisibleOverrideSchema,
  prefabAlphaOverrideSchema,
  prefabOverrideSchema,
  prefabInstanceLinkSchema,
  prefabDataSchema,
  parsePrefabData,
  isCurrentPrefabSchemaVersion,
  serializePrefabData,
  cloneSerializableNode,
  remintPrefabInstanceIds,
  cloneComponentWithNewId,
  createPrefabInstanceLink,
  getPrefabLink,
  isPrefabInstanceRoot,
  isInheritedPrefabNode,
  isLocalPrefabChild,
  findPrefabInstanceRoot,
  getPrefabInstanceOverrides,
  sourceComponentIdFor,
  sceneComponentIdForSource,
  collectPrefabInstanceNodes,
  findInstanceNodeBySourceId,
  collectPrefabAssetIdsFromNodes,
  sortPrefabOverrides,
  findPropertyOverride,
  isPropertyOverridden,
  upsertPrefabOverride,
  removePrefabOverride,
  applyPropertyOverrideToComponent,
  revertPropertyOnComponent,
  computePrefabOverrides,
  applyOverridesToInstance,
  applySourceValueToPrefabNode,
  applyNameOrLayerToPrefabNode,
  findPrefabSourceNode,
  instantiatePrefab,
  instantiateFromSource,
  resolvePrefabInstance,
  resolveScenePrefabs,
  instantiatePrefabResolved,
  applyOverridesToPrefabAsset,
  createEmptyPrefabId,
  expandPrefabSourceTree,
  unpackPrefabInstance,
  createPrefabFromSubtree,
  getValueAtPath,
  setValueAtPath,
  deleteValueAtPath,
  collectChangedPropertyPaths,
  prefabValuesEqual,
  cloneJson,
} from "./prefab/index.js";


