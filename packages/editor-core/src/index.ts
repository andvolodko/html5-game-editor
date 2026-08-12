export { DocumentManager, hasUnsavedChanges } from "./document-manager.js";
export type {
  DocumentDirtyState,
  DocumentListener,
  SceneMutation,
} from "./document-manager.js";
export { Editor, isChordLetter } from "./editor.js";
export type { EditorOptions, RenameRequestTarget } from "./editor.js";
export { KEYBOARD_NUDGE_PIXELS, arrowNudgeDelta, isAssetsPanelKeyTarget } from "./editor-hotkeys.js";
export { SelectionManager } from "./selection-manager.js";
export type { EditorSelection } from "./selection-manager.js";
export { EditorViewportController } from "./viewport-controller.js";
export {
  CreateSpriteCommand,
  CreateSpineCommand,
  CreateNodeCommand,
  SetTransform2DCommand,
  SetSpriteSizeCommand,
  SetVisualComponentCommand,
  MoveNodeCommand,
  CreateContainerCommand,
  DeleteNodeCommand,
  DeleteNodesCommand,
  DuplicateNodeCommand,
  RenameNodeCommand,
  SetSceneNameCommand,
  createDeleteSelectionCommand,
} from "./commands/index.js";
export type {
  Transform2DPatch,
  SpriteSizePatch,
  CreateSpriteOptions,
  CreateSpineOptions,
  CreateNodeOptions,
  MoveNodeCommandArgs,
} from "./commands/index.js";
export {
  NodeTypeRegistry,
  defaultNodeTypeRegistry,
  ensureDefaultNodeTypesRegistered,
  registerPixiNodeTypes,
  resolveCreateParentId,
} from "./node-types/index.js";
export type {
  NodeTypeId,
  NodeCreationContext,
  NodeTypeDefinition,
  NodeTypeCategoryGroup,
} from "./node-types/index.js";

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
export type { ProjectListEntry } from "@game-editor/project";
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
} from "./asset-browser-model.js";
export type { AssetBrowserEntry } from "./asset-browser-model.js";
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
