export { DocumentManager, hasUnsavedChanges } from "./document-manager.js";
export type {
  DocumentDirtyState,
  DocumentListener,
  SceneMutation,
} from "./document-manager.js";
export { Editor, isChordLetter } from "./editor.js";
export type { EditorOptions, RenameRequestTarget } from "./editor.js";
export {
  isCopyableComponent,
  listCopyableComponents,
} from "./component-clipboard.js";
export {
  EditorConsole,
  EDITOR_CONSOLE_CATEGORY_SCENE,
  EDITOR_CONSOLE_EVENT_SCENE_OPENED,
  MAX_CONSOLE_LOG_ENTRIES,
  formatSceneOpenedMessage,
} from "./editor-console.js";
export type {
  ConsoleLogEntry,
  ConsoleLogInput,
  ConsoleLogLevel,
} from "./editor-console.js";
export { KEYBOARD_NUDGE_PIXELS, arrowNudgeDelta, isAssetsPanelKeyTarget } from "./editor-hotkeys.js";
export { SelectionManager } from "./selection-manager.js";
export type { EditorSelection } from "./selection-manager.js";
export {
  applyListSelection,
  idsBetweenInclusive,
  isToggleSelectionKey,
} from "./list-selection.js";
export type { ListSelectionModifiers } from "./list-selection.js";
export {
  flattenVisibleNodeIds,
  hierarchyQueryMatchesName,
  hierarchySearchExpandIds,
  hierarchySearchVisibleIds,
  isHierarchySearching,
} from "./hierarchy-visible.js";
export {
  HIERARCHY_CHROME_ATTR,
  isHierarchyChromeEventTarget,
} from "./hierarchy-chrome.js";
export {
  applyEditorNodeOverlay,
  createLocalStorageEditorNodeMetadataStorage,
  createMemoryEditorNodeMetadataStorage,
  descendantNodeIds,
  editorDocumentKey,
  editorNodeMetadataStorageKey,
  emptyEditorSceneNodeMetadata,
  getEditorNodeFlags,
  isHierarchyDropBlockedByLock,
  isNodeEffectivelyHidden,
  isNodeEffectivelyLocked,
  isNodeEffectivelyVisible,
  isNodeHiddenInEditor,
  isNodeLocked,
  sceneHasHiddenNodes,
  sceneHasLockedNodes,
  subtreeNodeIds,
} from "./editor-node-metadata.js";
export type {
  EditorNodeFlags,
  EditorNodeMetadataStorage,
  EditorNodeState,
  EditorSceneNodeMetadata,
} from "./editor-node-metadata.js";
export { EditorNodeMetadataStore } from "./editor-node-metadata-store.js";
export { EditorViewportController } from "./viewport-controller.js";
export {
  CreateSpriteCommand,
  CreateSpineCommand,
  CreateAnimatedSpriteCommand,
  CreateModel3DCommand,
  CreateNodeCommand,
  SetTransform2DCommand,
  SetTransform3DCommand,
  ResetNodeTransformCommand,
  SetModel3DCommand,
  SetPerspectiveCameraCommand,
  SetDirectionalLightCommand,
  SetAmbientLightCommand,
  SetSceneRendererCommand,
  SetNodeLayerCommand,
  SetNodeVisibleCommand,
  SetNodeAlphaCommand,
  SetSpriteSizeCommand,
  SetVisualComponentCommand,
  MoveNodeCommand,
  CreateContainerCommand,
  DeleteNodeCommand,
  DeleteNodesCommand,
  DuplicateNodeCommand,
  PasteNodesCommand,
  PasteComponentCommand,
  RenameSceneFileCommand,
  DeleteSceneFileCommand,
  RenameAssetCommand,
  DeleteAssetCommand,
  DuplicateAssetCommand,
  RenameAssetFolderCommand,
  DeleteAssetFolderCommand,
  RenameNodeCommand,
  SetSceneNameCommand,
  AddScriptComponentCommand,
  AddHitZoneCommand,
  AddMaskCommand,
  RemoveComponentCommand,
  SetScriptPropertiesCommand,
  SetScriptEnabledCommand,
  SetHitZoneCommand,
  SetMaskCommand,
  createDeleteSelectionCommand,
  createResetNodeTransformCommand,
  InstantiatePrefabCommand,
  UnpackPrefabCommand,
  RevertPrefabOverridesCommand,
  ConvertSubtreeToPrefabInstanceCommand,
  RefreshPrefabInstancesCommand,
  PaintTilemapCommand,
} from "./commands/index.js";
export type {
  Transform2DPatch,
  Transform3DPatch,
  Model3DPatch,
  PerspectiveCameraPatch,
  DirectionalLightPatch,
  AmbientLightPatch,
  SceneRendererKind,
  SpriteSizePatch,
  HitZonePatch,
  MaskPatch,
  CreateSpriteOptions,
  ResetNodeTransformOptions,
  CreateSpineOptions,
  CreateAnimatedSpriteOptions,
  CreateModel3DOptions,
  CreateNodeOptions,
  MoveNodeCommandArgs,
} from "./commands/index.js";
export {
  NodeTypeRegistry,
  defaultNodeTypeRegistry,
  ensureDefaultNodeTypesRegistered,
  registerPixiNodeTypes,
  registerThreeNodeTypes,
  resolveCreateParentId,
  NODE_TYPE_RENDERER_LABELS,
} from "./node-types/index.js";
export type {
  NodeTypeId,
  NodeCreationContext,
  NodeTypeDefinition,
  NodeTypeCategoryGroup,
  NodeTypeRendererGroup,
} from "./node-types/index.js";
export {
  ComponentRegistry,
  defaultComponentRegistry,
  defineComponent,
  defaultPropertiesFromDefinition,
  registerSharedComponents,
  installSceneFlowRuntime,
  changeSceneComponent,
  performanceMeterComponent,
  buttonComponent,
} from "@game-editor/game-components";
export type {
  ComponentDefinition,
  ComponentCategoryGroup,
  ComponentPropertyDefinition,
  ComponentPropertyDynamicEnum,
  DynamicEnumSource,
  BusEventDefinition,
  ScriptInstance,
  ScriptCreateContext,
  ScriptRuntimeServices,
  RuntimeTransform2D,
  ScriptTransform2D,
  ScriptTransform2DPatch,
  ScriptPerformanceStats,
  ScriptRendererDrawStats,
} from "@game-editor/game-components";

export {
  sizeFromHandleDrag,
  rotationFromHandleDrag,
  gizmoHandleLocalPosition,
  sizeHandleCursor,
  isSpriteSizeHandle,
  isCornerHandle,
  normalizeRotationDegrees,
  SPRITE_SIZE_HANDLES,
  SPRITE_GIZMO_MIN_SIZE,
} from "@game-editor/scene";
export type {
  SpriteGizmoHandle,
  SpriteSizeHandle,
} from "@game-editor/scene";
export {
  createFetchSceneApiClient,
  allocateSceneFileId,
  isValidSceneFileId,
} from "./scene-api-client.js";
export type { SceneApiClient, SceneListEntry } from "./scene-api-client.js";
export { createFetchPrefabApiClient } from "./prefab-api-client.js";
export type { PrefabApiClient, PrefabCreateResult } from "./prefab-api-client.js";
export { createFetchTileSetApiClient } from "./tileset-api-client.js";
export type { TileSetApiClient, TileSetCreateResult } from "./tileset-api-client.js";
export { TilemapEditSession } from "./tilemap-edit-session.js";
export type { TilemapEditTool } from "./tilemap-edit-session.js";
export {
  createTileSetFromTexture,
  saveTileSetDocument,
  tileSetDocumentFromAsset,
} from "./editor-tileset-workflows.js";
export { PrefabManager } from "./prefab-manager.js";
export type { EditorDocumentMode } from "./prefab-manager.js";
export {
  PREFAB_INHERITED_LOCKED_CODE,
  PREFAB_INHERITED_LOCKED_MESSAGE,
  isPrefabStructureEditAllowed,
} from "./prefab-structure.js";
export {
  AssetManager,
  createFetchAssetApiClient,
} from "./asset-manager.js";
export type {
  AssetApiClient,
  AssetManagerStatus,
  AssetListResult,
  AssetImportApiResult,
  AssetMutationApiResult,
  AssetDeleteApiResult,
  FolderRenameApiResult,
} from "./asset-manager.js";
export {
  ProjectManager,
} from "./project-manager.js";
export type {
  ProjectManagerStatus,
} from "./project-manager.js";
export {
  createFetchProjectApiClient,
} from "./project-api-client.js";
export type {
  ProjectApiClient,
  ProjectListResult,
  OpenProjectResult,
} from "./project-api-client.js";
export {
  createFetchComponentCatalogApiClient,
} from "./component-catalog-api-client.js";
export type { ComponentCatalogApiClient } from "./component-catalog-api-client.js";
export type { ProjectListEntry, ProjectData, ProjectResolution } from "@game-editor/project";
export {
  applyComponentCatalog,
  buildComponentCatalog,
  parseComponentCatalogData,
} from "@game-editor/game-components";
export type {
  ComponentCatalogData,
  ComponentCatalogEntry,
} from "@game-editor/game-components";
export {
  importDroppedFiles,
  dropAssetOntoScene,
  dropAssetsOntoScene,
  EDITOR_ASSET_MIME,
  EDITOR_FOLDER_MIME,
  encodeAssetDragPayload,
  decodeAssetDragPayload,
  assetIdsFromDragPayload,
  encodeFolderDragPayload,
  decodeFolderDragPayload,
  MULTI_ASSET_SCENE_DROP_OFFSET,
} from "./asset-workflows.js";
export type {
  ImportDroppedFilesResult,
  EditorAssetDragPayload,
  EditorFolderDragPayload,
} from "./asset-workflows.js";
export {
  collectDroppedFiles,
  collectFilesFromDroppedEntries,
  droppedFileUploadName,
  droppedFolderPaths,
} from "./collect-dropped-files.js";
export type {
  DroppedFsEntry,
  DroppedFileEntry,
  DroppedDirectoryEntry,
} from "./collect-dropped-files.js";
export {
  PROJECT_SERVER_OFFLINE_MESSAGE,
  formatEditorApiError,
  formatEditorApiErrorMessage,
  uniquePanelErrorMessages,
} from "./editor-api-error.js";
export {
  ASSETS_ROOT_FOLDER,
  SCENES_FOLDER,
  isScenesFolder,
  isScenesFolderOrDescendant,
  parentFolder,
  listChildFolders,
  listAssetsInFolder,
  listFolderEntries,
  filterAssetsByQuery,
  filterScenesByQuery,
  folderLabel,
  joinAssetFolder,
  isFolderOrDescendant,
  resolveAssetBrowserPreviewUrl,
} from "./asset-browser-model.js";
export type {
  AssetBrowserEntry,
  AssetBrowserPreviewResolvers,
} from "./asset-browser-model.js";
export {
  assetBrowserItemKey,
  parseAssetBrowserItemKey,
  assetBrowserItemsEqual,
  flattenVisibleBrowserItems,
  rootMostFolderPaths,
} from "./asset-browser-selection.js";
export type { AssetBrowserSelectionItem } from "./asset-browser-selection.js";
export {
  resolveHierarchyDrop,
  resolveHierarchyMultiDrop,
  hierarchyDragNodeIds,
  isNoOpMove,
  placementFromRowOffset,
  toPostDetachIndex,
  HIERARCHY_DROP_BEFORE_RATIO,
  HIERARCHY_DROP_AFTER_RATIO,
} from "./hierarchy-dnd.js";
export type {
  HierarchyDropPlacement,
  HierarchyDropTarget,
  HierarchyMultiMove,
} from "./hierarchy-dnd.js";
