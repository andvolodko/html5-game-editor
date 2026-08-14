export { DocumentManager, hasUnsavedChanges } from "./document-manager.js";
export type {
  DocumentDirtyState,
  DocumentListener,
  SceneMutation,
} from "./document-manager.js";
export { Editor, isChordLetter } from "./editor.js";
export type { EditorOptions, RenameRequestTarget } from "./editor.js";
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
  SetSpriteSizeCommand,
  SetVisualComponentCommand,
  MoveNodeCommand,
  CreateContainerCommand,
  DeleteNodeCommand,
  DeleteNodesCommand,
  DuplicateNodeCommand,
  PasteNodesCommand,
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
  RemoveComponentCommand,
  SetScriptPropertiesCommand,
  createDeleteSelectionCommand,
  createResetNodeTransformCommand,
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
  EDITOR_ASSET_MIME,
  EDITOR_FOLDER_MIME,
  encodeAssetDragPayload,
  decodeAssetDragPayload,
  encodeFolderDragPayload,
  decodeFolderDragPayload,
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
  resolveHierarchyDrop,
  isNoOpMove,
  placementFromRowOffset,
  toPostDetachIndex,
  HIERARCHY_DROP_BEFORE_RATIO,
  HIERARCHY_DROP_AFTER_RATIO,
} from "./hierarchy-dnd.js";
export type {
  HierarchyDropPlacement,
  HierarchyDropTarget,
} from "./hierarchy-dnd.js";
