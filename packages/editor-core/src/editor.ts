import { humanizeAssetNodeName, rasterAssetDisplaySize, type AssetRecord, type TileSetData } from "@game-editor/assets";
import {
  CommandManager,
  CompositeCommand,
  type Command,
} from "@game-editor/commands";
import { ComponentRegistry } from "@game-editor/game-components";
import {
  applyComponentCatalog,
  installSceneFlowRuntime,
  type BusEventDefinition,
} from "@game-editor/game-components";
import {
  createEmptyScene,
  findNodeById,
  getAncestorIds,
  getTransform2D,
  getVisualComponent,
  parseSceneData,
  resolveScenePrefabs,
  type SceneData,
  type SceneRenderer,
  type SceneRendererKind,
  type TileChange,
  type Vec2,
  type Vec3,
} from "@game-editor/scene";
import {
  CreateSpriteCommand,
  CreateSpineCommand,
  CreateAnimatedSpriteCommand,
  CreateModel3DCommand,
  CreateNodeCommand,
  DeleteNodeCommand,
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
  MoveNodeCommand,
  RenameNodeCommand,
  SetSceneNameCommand,
  SetSceneRendererCommand,
  SetNodeLayerCommand,
  SetNodeVisibleCommand,
  SetNodeAlphaCommand,
  SetTransform2DCommand,
  SetTransform3DCommand,
  createResetNodeTransformCommand,
  SetModel3DCommand,
  SetPerspectiveCameraCommand,
  SetDirectionalLightCommand,
  SetAmbientLightCommand,
  SetSpriteSizeCommand,
  SetVisualComponentCommand,
  SetHitZoneCommand,
  SetMaskCommand,
  AddScriptComponentCommand,
  AddHitZoneCommand,
  AddMaskCommand,
  RemoveComponentCommand,
  SetScriptPropertiesCommand,
  SetScriptEnabledCommand,
  createDeleteSelectionCommand,
  type CreateSpriteOptions,
  type CreateAnimatedSpriteOptions,
  type CreateNodeOptions,
  type Transform2DPatch,
  type Transform3DPatch,
  type Model3DPatch,
  type PerspectiveCameraPatch,
  type DirectionalLightPatch,
  type AmbientLightPatch,
  type SpriteSizePatch,
  type HitZonePatch,
  type MaskPatch,
} from "./commands/index.js";
import {
  ensureDefaultNodeTypesRegistered,
  resolveCreateParentId,
  type NodeTypeId,
  type NodeTypeRegistry,
} from "./node-types/index.js";
import {
  DocumentManager,
  hasUnsavedChanges,
  type DocumentContentSnapshot,
  type DocumentDirtyState,
} from "./document-manager.js";
import type { SceneApiClient, SceneListEntry } from "./scene-api-client.js";
import { SelectionManager } from "./selection-manager.js";
import type { ListSelectionModifiers } from "./list-selection.js";
import type { HierarchyMultiMove } from "./hierarchy-dnd.js";
import { EditorViewportController } from "./viewport-controller.js";
import {
  AssetManager,
  type AssetApiClient,
} from "./asset-manager.js";
import {
  ProjectManager,
} from "./project-manager.js";
import type { ProjectApiClient } from "./project-api-client.js";
import type { ComponentCatalogApiClient } from "./component-catalog-api-client.js";
import { bindEditorHotkeys } from "./editor-hotkeys.js";
import { NodeClipboard, resolvePasteLocation } from "./node-clipboard.js";
import {
  ComponentClipboard,
  describeCopiedComponents,
  isCopyableComponent,
  listCopyableComponents,
  pasteComponentsBlockedReason,
  selectPasteableComponents,
} from "./component-clipboard.js";
import { isAsyncCommand, type SceneFileHistoryHost } from "./scene-file-history-host.js";
import type { AssetHistoryHost } from "./asset-history-host.js";
import {
  allocateSceneDocumentId,
  createSceneDocument,
  duplicateSceneDocument,
  deleteSceneDocumentFile,
  restoreDeletedSceneDocument,
  listSceneDocuments,
  loadSceneDocument,
  renameSceneDocumentFile,
  saveSceneDocument,
  type ScenePersistenceHost,
} from "./editor-scene-persistence.js";
import { RenameRequestBus, type RenameRequestListener } from "./rename-request-bus.js";
import { EditorConsole } from "./editor-console.js";
import { PrefabManager, type EditorDocumentMode } from "./prefab-manager.js";
import type { PrefabApiClient } from "./prefab-api-client.js";
import type { TileSetApiClient } from "./tileset-api-client.js";
import { TilemapEditSession } from "./tilemap-edit-session.js";
import {
  createTileSetFromTexture,
  saveTileSetDocument,
} from "./editor-tileset-workflows.js";
import { PaintTilemapCommand } from "./commands/paint-tilemap-command.js";
import {
  applyPrefabOverrides,
  createPrefabFromSelectedNode,
  instantiatePrefabFromAsset,
  openPrefabDocument,
  closePrefabDocument,
  reportPrefabWorkflowError,
  revertPrefabOverrides,
  saveOpenPrefabDocument,
  unpackPrefabInstance,
} from "./editor-prefab-workflows.js";
import {
  applyEditorNodeOverlay,
  descendantNodeIds,
  getEditorNodeFlags,
  isNodeEffectivelyLocked,
  isNodeEffectivelyVisible,
  isNodeHiddenInEditor,
  isNodeLocked,
  sceneHasHiddenNodes,
  sceneHasLockedNodes,
  subtreeNodeIds,
  type EditorNodeFlags,
} from "./editor-node-metadata.js";
import { EditorNodeMetadataStore } from "./editor-node-metadata-store.js";

export type { RenameRequestTarget } from "./rename-request-bus.js";
export { isChordLetter } from "./editor-hotkeys.js";

type Listener = () => void;

export interface EditorOptions {
  scene?: SceneData;
  /** Active scene file id used by save/load. */
  sceneFileId?: string;
  sceneApi?: SceneApiClient;
  assetApi?: AssetApiClient;
  projectApi?: ProjectApiClient;
  componentCatalogApi?: ComponentCatalogApiClient;
  prefabApi?: PrefabApiClient;
  tileSetApi?: TileSetApiClient;
}

/**
 * Editor façade: document + selection + commands + viewport sync + project I/O.
 * React should read state and dispatch through this layer.
 */
export class Editor {
  readonly document: DocumentManager;
  readonly selection: SelectionManager;
  readonly commands: CommandManager;
  readonly viewport: EditorViewportController;
  readonly assets: AssetManager;
  readonly project: ProjectManager;
  /** Session catalog of Add Component script definitions for the open project. */
  readonly components: ComponentRegistry;
  /** Structured log for the Console panel (not scene/document state). */
  readonly console: EditorConsole;
  readonly prefabs: PrefabManager;
  readonly tilemapEdit: TilemapEditSession;
  readonly nodeMetadata: EditorNodeMetadataStore;
  private tileSetApi: TileSetApiClient | undefined;
  /** Bus event ids for dynamicEnum source `busEvents` (set when loading game catalog). */
  private busEvents: readonly BusEventDefinition[] = [];

  private sceneFileId: string;
  private sceneApi: SceneApiClient | undefined;
  private componentCatalogApi: ComponentCatalogApiClient | undefined;
  private readonly listeners = new Set<Listener>();
  private readonly renameBus = new RenameRequestBus();
  private readonly nodeClipboard = new NodeClipboard();
  private readonly componentClipboard = new ComponentClipboard();
  private historyBusy = false;
  private readonly unsubscribers: Array<() => void> = [];
  /** Bumps on every façade emit (document, selection, assets, dirty, …). */
  private storeVersion = 0;

  constructor(options: EditorOptions = {}) {
    this.document = new DocumentManager(
      options.scene ?? createEmptyScene("Main Scene"),
    );
    this.selection = new SelectionManager();
    this.commands = new CommandManager();
    this.nodeMetadata = new EditorNodeMetadataStore();
    this.viewport = new EditorViewportController(this.document, {
      sync: (renderer, scene) => {
        applyEditorNodeOverlay(
          renderer,
          scene,
          this.nodeMetadata.getSnapshot(),
        );
      },
    });
    this.assets = new AssetManager(options.assetApi);
    this.project = new ProjectManager(options.projectApi);
    this.components = new ComponentRegistry();
    this.console = new EditorConsole();
    this.prefabs = new PrefabManager();
    this.prefabs.setApi(options.prefabApi);
    this.tilemapEdit = new TilemapEditSession();
    this.tileSetApi = options.tileSetApi;
    this.prefabs.setMode({
      kind: "scene",
      sceneFileId: options.sceneFileId ?? "main",
    });
    this.sceneFileId = options.sceneFileId ?? "main";
    this.sceneApi = options.sceneApi;
    this.componentCatalogApi = options.componentCatalogApi;

    this.unsubscribers.push(
      this.document.subscribe(() => {
        this.emit();
      }),
      this.selection.subscribe(() => this.emit()),
      this.assets.subscribe(() => this.emit()),
      this.project.subscribe(() => {
        this.syncNodeMetadataScope();
        this.emit();
      }),
      this.console.subscribe(() => this.emit()),
      this.tilemapEdit.subscribe(() => this.emit()),
      this.nodeMetadata.subscribe(() => {
        this.syncEditorOverlay();
        this.emit();
      }),
    );
    this.syncNodeMetadataScope();
  }

  getScene(): SceneData {
    return this.document.getScene();
  }

  getSceneFileId(): string {
    return this.sceneFileId;
  }

  setSceneApi(client: SceneApiClient): void {
    this.sceneApi = client;
  }

  setAssetApi(client: AssetApiClient): void {
    this.assets.setApi(client);
  }

  setProjectApi(client: ProjectApiClient): void {
    this.project.setApi(client);
  }

  setComponentCatalogApi(client: ComponentCatalogApiClient): void {
    this.componentCatalogApi = client;
  }

  setPrefabApi(client: PrefabApiClient): void {
    this.prefabs.setApi(client);
  }

  setTileSetApi(client: TileSetApiClient): void {
    this.tileSetApi = client;
  }

  getTileSetApi(): TileSetApiClient | undefined {
    return this.tileSetApi;
  }

  createTileSetFromTexture(imageAssetId: string): Promise<string> {
    return createTileSetFromTexture(this, imageAssetId);
  }

  saveTileSetDocument(
    assetId: string,
    tileset: TileSetData,
  ): Promise<TileSetData> {
    return saveTileSetDocument(this, assetId, tileset);
  }

  instantiatePrefabFromAsset(
    assetId: string,
    position?: Vec2,
    parentId?: string,
  ): Promise<string> {
    if (parentId !== undefined && this.isNodeEffectivelyLocked(parentId)) {
      return Promise.resolve("");
    }
    return instantiatePrefabFromAsset(this, assetId, {
      ...(position !== undefined ? { position2D: position } : {}),
      parentId,
    });
  }

  instantiatePrefabAt3D(
    assetId: string,
    position: Vec3,
    parentId?: string,
  ): Promise<string> {
    if (parentId !== undefined && this.isNodeEffectivelyLocked(parentId)) {
      return Promise.resolve("");
    }
    return instantiatePrefabFromAsset(this, assetId, {
      position3D: position,
      parentId,
    });
  }

  createPrefabFromNode(nodeId: string): Promise<string> {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return Promise.resolve("");
    }
    return createPrefabFromSelectedNode(this, nodeId);
  }

  unpackPrefab(nodeId: string): void {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return;
    }
    unpackPrefabInstance(this, nodeId);
  }

  revertPrefabOverrides(nodeId: string, overrideIndex?: number): void {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return;
    }
    revertPrefabOverrides(this, nodeId, overrideIndex);
  }

  applyPrefabOverrides(nodeId: string, overrideIndex?: number): Promise<void> {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return Promise.resolve();
    }
    return applyPrefabOverrides(this, nodeId, overrideIndex);
  }

  openPrefab(assetId: string): Promise<void> {
    return openPrefabDocument(this, assetId).catch((error: unknown) => {
      reportPrefabWorkflowError(this, "Open Prefab failed", error);
      throw error;
    });
  }

  closePrefab(): Promise<void> {
    return closePrefabDocument(this).catch((error: unknown) => {
      reportPrefabWorkflowError(this, "Close Prefab failed", error);
      throw error;
    });
  }

  restorePrefabSceneSession(
    session: { sceneFileId: string; snapshot: DocumentContentSnapshot } | undefined,
  ): void {
    const sceneFileId = session?.sceneFileId ?? this.sceneFileId;
    this.sceneFileId = sceneFileId;
    this.prefabs.setMode({ kind: "scene", sceneFileId });
    this.syncNodeMetadataScope();
    if (session) {
      this.document.restoreSnapshot(session.snapshot);
      this.commands.clear();
      this.selection.clear();
    }
    this.emit();
  }

  setScene(scene: SceneData, options?: { preserveUndo?: boolean }): void {
    this.syncNodeMetadataScope();
    this.selection.clear();
    if (!options?.preserveUndo) {
      this.commands.clear();
    }
    const resolved =
      this.prefabs.getMode().kind === "prefab"
        ? scene
        : resolveScenePrefabs(scene, this.prefabs.getCatalog()).scene;
    this.document.replaceScene(resolved);
  }

  attachRenderer(renderer: SceneRenderer): void {
    this.viewport.attach(renderer);
  }

  detachRenderer(): void {
    this.viewport.detach();
  }

  /** Remount canvases when scene.renderer kind changes. */
  subscribeViewportRemount(
    listener: (kind: SceneRendererKind) => void,
  ): () => void {
    return this.viewport.subscribeRendererKindRemount(listener);
  }

  execute(command: Command): void {
    this.commands.execute(command);
    this.afterDocumentCommand();
  }

  undo(): boolean {
    if (this.historyBusy) {
      return false;
    }
    const top = this.commands.peekUndo();
    if (!top) {
      return false;
    }
    if (isAsyncCommand(top)) {
      void this.runAsyncHistory("undo");
      return true;
    }
    const did = this.commands.undo();
    if (did) {
      this.afterDocumentCommand();
    }
    return did;
  }

  redo(): boolean {
    if (this.historyBusy) {
      return false;
    }
    const top = this.commands.peekRedo();
    if (!top) {
      return false;
    }
    if (isAsyncCommand(top)) {
      void this.runAsyncHistory("redo");
      return true;
    }
    const did = this.commands.redo();
    if (did) {
      this.afterDocumentCommand();
    }
    return did;
  }

  createSprite(name?: string, position?: Vec2): string {
    return this.createNode({
      typeId: "pixi.sprite",
      ...(name !== undefined ? { name } : {}),
      ...(position !== undefined ? { position } : {}),
    });
  }

  /**
   * Creates a sprite that references `assetId`.
   * Copies texture metadata width/height into Sprite as the initial *display override*
   * (scene size is not live-bound to the asset; reimports do not auto-resize nodes).
   * Always inserts at scene root (asset drop UX).
   */
  createSpriteFromAsset(assetId: string, position: Vec2): string {
    const asset = this.assets.get(assetId);
    const options: CreateSpriteOptions = {
      name: asset ? humanizeAssetNodeName(asset.name) : "Missing Sprite",
      position,
      assetId,
    };
    const size = asset ? rasterAssetDisplaySize(asset) : undefined;
    if (size) {
      options.width = size.width;
      options.height = size.height;
    }
    const command = new CreateSpriteCommand(
      this.document,
      this.selection,
      options,
    );
    this.execute(command);
    return command.createdNodeId;
  }

  createAnimatedSpriteFromAsset(assetId: string, position: Vec2): string {
    const asset = this.assets.get(assetId);
    const options: CreateAnimatedSpriteOptions = {
      name: asset ? humanizeAssetNodeName(asset.name) : "Missing Animated Sprite",
      position,
      assetId,
      playing: true,
    };
    if (asset?.metadata.kind === "aseprite") {
      options.animation = asset.metadata.tags[0]?.name;
      const size = rasterAssetDisplaySize(asset);
      if (size) {
        options.width = size.width;
        options.height = size.height;
      }
    }
    const command = new CreateAnimatedSpriteCommand(
      this.document,
      this.selection,
      options,
    );
    this.execute(command);
    return command.createdNodeId;
  }

  createSpineFromAsset(assetId: string, position: Vec2): string {
    const asset = this.assets.get(assetId);
    const command = new CreateSpineCommand(this.document, this.selection, {
      name: asset ? humanizeAssetNodeName(asset.name) : "Missing Spine",
      position,
      assetId,
    });
    this.execute(command);
    return command.createdNodeId;
  }

  createBitmapTextFromAsset(assetId: string, position: Vec2): string {
    const asset = this.assets.get(assetId);
    return this.createNode({
      typeId: "pixi.bitmap-text",
      name: asset ? humanizeAssetNodeName(asset.name) : "Missing Bitmap Font",
      position,
      assetId,
      resolveParent: false,
    });
  }

  createTextFromAsset(assetId: string, position: Vec2): string {
    const asset = this.assets.get(assetId);
    const fontFamily =
      asset?.metadata.kind === "webfont"
        ? asset.metadata.fontFamily
        : undefined;
    return this.createNode({
      typeId: "pixi.text",
      name: asset ? humanizeAssetNodeName(asset.name) : "Missing Font",
      position,
      assetId,
      ...(fontFamily !== undefined ? { fontFamily } : {}),
      resolveParent: false,
    });
  }

  createModel3DFromAsset(assetId: string, position: Vec2): string {
    const asset = this.assets.get(assetId);
    const command = new CreateModel3DCommand(this.document, this.selection, {
      name: asset ? humanizeAssetNodeName(asset.name) : "Missing Model",
      position,
      assetId,
    });
    this.execute(command);
    return command.createdNodeId;
  }

  createContainer(parentId?: string): string {
    return this.createNode({
      typeId: "pixi.container",
      ...(parentId !== undefined
        ? { parentId, resolveParent: false }
        : {}),
    });
  }

  /**
   * Create a node from the NodeTypeRegistry.
   * Default parent policy: child of selected container, else sibling of selected leaf, else root.
   */
  createNode(options: CreateNodeOptions | NodeTypeId): string {
    ensureDefaultNodeTypesRegistered();
    const normalized: CreateNodeOptions =
      typeof options === "string" ? { typeId: options } : options;
    const scene = this.getScene();
    const resolveParent = normalized.resolveParent !== false;
    const parentId = resolveParent
      ? resolveCreateParentId(scene, this.selection.getPrimaryNodeId())
      : normalized.parentId;
    if (parentId !== undefined && this.isNodeEffectivelyLocked(parentId)) {
      return "";
    }
    const command = new CreateNodeCommand(
      this.document,
      this.selection,
      normalized,
    );
    this.execute(command);
    return command.createdNodeId;
  }

  getNodeTypeRegistry(): NodeTypeRegistry {
    return ensureDefaultNodeTypesRegistered();
  }

  renameNode(nodeId: string, name: string): void {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return;
    }
    this.execute(new RenameNodeCommand(this.document, nodeId, name));
  }

  renameScene(name: string): void {
    this.execute(new SetSceneNameCommand(this.document, name));
  }

  duplicateNode(nodeId?: string): string | undefined {
    const id = nodeId ?? this.selection.getPrimaryNodeId();
    if (!id || this.isNodeEffectivelyLocked(id)) {
      return undefined;
    }
    try {
      const command = new DuplicateNodeCommand(
        this.document,
        this.selection,
        id,
      );
      this.execute(command);
      return command.createdNodeId;
    } catch (error) {
      this.console.log({
        level: "warn",
        category: "prefab",
        message: error instanceof Error ? error.message : "Duplicate failed",
      });
      return undefined;
    }
  }

  /** Copy selected root-most nodes into the editor clipboard. */
  copySelectedNodes(): boolean {
    return this.nodeClipboard.copyFromScene(
      this.document.getScene(),
      this.selection.getSelectedNodeIds(),
    );
  }

  /**
   * Paste clipboard nodes as siblings after the primary selection
   * (or at the scene root). One undo step.
   */
  pasteNodes(): readonly string[] {
    if (!this.nodeClipboard.hasContent()) {
      return [];
    }
    const scene = this.document.getScene();
    const location = resolvePasteLocation(
      scene,
      this.selection.getPrimaryNodeId(),
    );
    if (
      location.parentId !== undefined &&
      this.isNodeEffectivelyLocked(location.parentId)
    ) {
      return [];
    }
    const command = new PasteNodesCommand(
      this.document,
      this.selection,
      this.nodeClipboard.templates(),
      location.parentId,
      location.index,
    );
    this.execute(command);
    return command.createdNodeIds;
  }

  deleteSelectedNodes(): void {
    const scene = this.document.getScene();
    const unlocked = this.selection
      .getSelectedNodeIds()
      .filter((id) => !isNodeEffectivelyLocked(scene, this.nodeMetadata.getSnapshot(), id));
    if (unlocked.length === 0) {
      return;
    }
    const previous = this.selection.getSelectedNodeIds();
    this.selection.setSelection(unlocked);
    const command = createDeleteSelectionCommand(this.document, this.selection);
    if (!command) {
      this.selection.setSelection(previous);
      return;
    }
    this.execute(command);
  }

  deleteNode(nodeId: string): void {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return;
    }
    try {
      this.execute(new DeleteNodeCommand(this.document, this.selection, nodeId));
    } catch (error) {
      this.console.log({
        level: "warn",
        category: "prefab",
        message: error instanceof Error ? error.message : "Delete failed",
      });
    }
  }

  /**
   * Reparent/reorder a node (one undo step). Preserves world Transform2D by default.
   */
  moveNode(
    nodeId: string,
    toParentId: string | undefined,
    toIndex: number,
    options?: { preserveWorldTransform?: boolean },
  ): void {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return;
    }
    if (toParentId !== undefined && this.isNodeEffectivelyLocked(toParentId)) {
      return;
    }
    try {
      this.execute(
        new MoveNodeCommand(this.document, {
          nodeId,
          toParentId,
          toIndex,
          ...(options?.preserveWorldTransform !== undefined
            ? { preserveWorldTransform: options.preserveWorldTransform }
            : {}),
        }),
      );
    } catch (error) {
      this.console.log({
        level: "warn",
        category: "prefab",
        message: error instanceof Error ? error.message : "Move failed",
      });
    }
  }

  /**
   * Reparent/reorder several nodes as one undo step.
   * `moves` must already be post-detach (from `resolveHierarchyMultiDrop`).
   */
  moveNodes(moves: readonly HierarchyMultiMove[]): void {
    if (moves.length === 0) {
      return;
    }
    const allowed = moves.filter((move) => {
      if (this.isNodeEffectivelyLocked(move.nodeId)) {
        return false;
      }
      return (
        move.toParentId === undefined ||
        !this.isNodeEffectivelyLocked(move.toParentId)
      );
    });
    if (allowed.length === 0) {
      return;
    }
    if (allowed.length === 1) {
      const only = allowed[0];
      if (!only) {
        return;
      }
      this.moveNode(only.nodeId, only.toParentId, only.toIndex);
      return;
    }
    try {
      const commands = allowed.map(
        (move) =>
          new MoveNodeCommand(this.document, {
            nodeId: move.nodeId,
            toParentId: move.toParentId,
            toIndex: move.toIndex,
          }),
      );
      this.execute(new CompositeCommand("MoveNodes", commands));
    } catch (error) {
      this.console.log({
        level: "warn",
        category: "prefab",
        message: error instanceof Error ? error.message : "Move failed",
      });
    }
  }

  setTransform2D(nodeId: string, patch: Transform2DPatch): void {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return;
    }
    this.execute(new SetTransform2DCommand(this.document, nodeId, patch));
  }

  setTransform3D(nodeId: string, patch: Transform3DPatch): void {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return;
    }
    this.execute(new SetTransform3DCommand(this.document, nodeId, patch));
  }

  /**
   * Reset Transform2D / Transform3D (position, rotation, scale), visual anchor,
   * and display width/height to identity/defaults (one undo step).
   * Textured sprites restore native asset size when available.
   * Uses the primary selection when `nodeId` is omitted.
   */
  resetNodeTransform(nodeId?: string): boolean {
    const id = nodeId ?? this.selection.getPrimaryNodeId();
    if (!id || this.isNodeEffectivelyLocked(id)) {
      return false;
    }
    const node = findNodeById(this.document.getScene(), id);
    const visual = node ? getVisualComponent(node) : undefined;
    const assetId =
      visual && "assetId" in visual && typeof visual.assetId === "string"
        ? visual.assetId
        : undefined;
    const asset = assetId ? this.assets.get(assetId) : undefined;
    const displaySize = asset ? rasterAssetDisplaySize(asset) : undefined;
    const command = createResetNodeTransformCommand(
      this.document,
      id,
      displaySize ? { displaySize } : undefined,
    );
    if (!command) {
      return false;
    }
    this.execute(command);
    return true;
  }

  setModel3D(nodeId: string, patch: Model3DPatch): void {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return;
    }
    this.execute(new SetModel3DCommand(this.document, nodeId, patch));
  }

  setPerspectiveCamera(nodeId: string, patch: PerspectiveCameraPatch): void {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return;
    }
    this.execute(new SetPerspectiveCameraCommand(this.document, nodeId, patch));
  }

  setDirectionalLight(nodeId: string, patch: DirectionalLightPatch): void {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return;
    }
    this.execute(new SetDirectionalLightCommand(this.document, nodeId, patch));
  }

  setAmbientLight(nodeId: string, patch: AmbientLightPatch): void {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return;
    }
    this.execute(new SetAmbientLightCommand(this.document, nodeId, patch));
  }

  setSceneRenderer(renderer: SceneRendererKind): void {
    this.execute(new SetSceneRendererCommand(this.document, renderer));
  }

  setNodeLayer(nodeId: string, layer: "background" | "foreground"): void {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return;
    }
    this.execute(new SetNodeLayerCommand(this.document, nodeId, layer));
  }

  setNodeVisible(nodeId: string, visible: boolean): void {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return;
    }
    this.execute(new SetNodeVisibleCommand(this.document, nodeId, visible));
  }

  setNodeAlpha(nodeId: string, alpha: number): void {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return;
    }
    this.execute(new SetNodeAlphaCommand(this.document, nodeId, alpha));
  }

  /**
   * Nudge selected nodes by Transform2D position delta (one undo step).
   * Returns false when nothing moved (empty selection / no Transform2D).
   */
  nudgeSelectedNodes(deltaX: number, deltaY: number): boolean {
    const nodeIds = this.selection.getSelectedNodeIds();
    if (nodeIds.length === 0) {
      return false;
    }

    const scene = this.document.getScene();
    const commands: Command[] = [];
    for (const nodeId of nodeIds) {
      const node = findNodeById(scene, nodeId);
      const transform = node ? getTransform2D(node) : undefined;
      if (!transform || this.isNodeEffectivelyLocked(nodeId)) {
        continue;
      }
      commands.push(
        new SetTransform2DCommand(this.document, nodeId, {
          position: {
            x: transform.position.x + deltaX,
            y: transform.position.y + deltaY,
          },
        }),
      );
    }

    if (commands.length === 0) {
      return false;
    }
    if (commands.length === 1) {
      this.execute(commands[0]!);
    } else {
      this.execute(new CompositeCommand("NudgeSelection", commands));
    }
    return true;
  }

  setSpriteSize(nodeId: string, patch: SpriteSizePatch): void {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return;
    }
    this.execute(new SetSpriteSizeCommand(this.document, nodeId, patch));
  }

  /** Patch the node's leaf visual component (one undo step). */
  setVisualComponent(nodeId: string, patch: Record<string, unknown>): void {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return;
    }
    this.execute(new SetVisualComponentCommand(this.document, nodeId, patch));
  }

  /** Commit one paint/erase stroke (changed cells only). */
  paintTilemap(
    nodeId: string,
    changes: readonly TileChange[],
    options?: { alreadyApplied?: boolean },
  ): void {
    if (changes.length === 0 || this.isNodeEffectivelyLocked(nodeId)) {
      return;
    }
    const command = new PaintTilemapCommand(this.document, nodeId, changes);
    if (options?.alreadyApplied === true) {
      this.commands.record(command);
      this.afterDocumentCommand();
      return;
    }
    this.execute(command);
  }

  /**
   * Replace the session script catalog (clear + register). Used when opening a project.
   * Not undoable.
   */
  replaceComponentCatalog(
    register: (registry: ComponentRegistry) => void,
  ): void {
    this.components.clear();
    this.busEvents = [];
    register(this.components);
    this.emit();
  }

  /**
   * Async catalog load (clear, await register, emit). Prefer this when importing
   * game component barrels dynamically.
   */
  async loadComponentCatalog(
    register: (registry: ComponentRegistry) => void | Promise<void>,
  ): Promise<void> {
    this.components.clear();
    this.busEvents = [];
    await register(this.components);
    this.emit();
  }

  /**
   * Fetch script catalog for the server's active project root and apply it.
   * Not undoable. Missing API or empty project barrel → empty catalog.
   */
  async refreshComponentCatalog(): Promise<void> {
    this.components.clear();
    this.busEvents = [];
    if (this.componentCatalogApi) {
      const catalog = await this.componentCatalogApi.getCatalog();
      applyComponentCatalog(this.components, catalog);
      installSceneFlowRuntime(this.components);
      this.busEvents = catalog.busEvents.map((event) => ({ ...event }));
    }
    this.emit();
  }

  /** Replace bus event options used by `dynamicEnum` fields with `source: "busEvents"`. */
  setBusEvents(events: readonly BusEventDefinition[]): void {
    this.busEvents = events.map((event) => ({ ...event }));
    this.emit();
  }

  getBusEvents(): readonly BusEventDefinition[] {
    return this.busEvents;
  }

  isNodeHiddenInEditor(nodeId: string): boolean {
    return isNodeHiddenInEditor(this.nodeMetadata.getSnapshot(), nodeId);
  }

  isNodeEffectivelyVisible(nodeId: string): boolean {
    return isNodeEffectivelyVisible(
      this.getScene(),
      this.nodeMetadata.getSnapshot(),
      nodeId,
    );
  }

  isNodeLocked(nodeId: string): boolean {
    return isNodeLocked(this.nodeMetadata.getSnapshot(), nodeId);
  }

  isNodeEffectivelyLocked(nodeId: string): boolean {
    return isNodeEffectivelyLocked(
      this.getScene(),
      this.nodeMetadata.getSnapshot(),
      nodeId,
    );
  }

  getEditorNodeFlags(nodeId: string): EditorNodeFlags {
    return getEditorNodeFlags(
      this.getScene(),
      this.nodeMetadata.getSnapshot(),
      nodeId,
    );
  }

  setNodeHidden(
    nodeId: string,
    hidden: boolean,
    options?: { recursive?: boolean },
  ): void {
    const ids =
      options?.recursive === true
        ? subtreeNodeIds(this.getScene(), nodeId)
        : [nodeId];
    this.nodeMetadata.setHidden(ids, hidden);
  }

  setNodeLocked(
    nodeId: string,
    locked: boolean,
    options?: { recursive?: boolean },
  ): void {
    const ids =
      options?.recursive === true
        ? subtreeNodeIds(this.getScene(), nodeId)
        : [nodeId];
    this.nodeMetadata.setLocked(ids, locked);
  }

  setNodeHiddenRecursive(nodeId: string, hidden: boolean): void {
    this.nodeMetadata.setHidden(
      descendantNodeIds(this.getScene(), nodeId),
      hidden,
    );
  }

  setNodeLockedRecursive(nodeId: string, locked: boolean): void {
    this.nodeMetadata.setLocked(
      descendantNodeIds(this.getScene(), nodeId),
      locked,
    );
  }

  showAllNodes(): void {
    this.nodeMetadata.showAll(this.getScene());
  }

  hideAllNodes(): void {
    this.nodeMetadata.hideAll(this.getScene());
  }

  lockAllNodes(): void {
    this.nodeMetadata.lockAll(this.getScene());
  }

  unlockAllNodes(): void {
    this.nodeMetadata.unlockAll(this.getScene());
  }

  toggleAllNodesHidden(): void {
    if (sceneHasHiddenNodes(this.getScene(), this.nodeMetadata.getSnapshot())) {
      this.showAllNodes();
      return;
    }
    this.hideAllNodes();
  }

  toggleAllNodesLocked(): void {
    if (sceneHasLockedNodes(this.getScene(), this.nodeMetadata.getSnapshot())) {
      this.unlockAllNodes();
      return;
    }
    this.lockAllNodes();
  }

  /**
   * Clears this node's own lock, or the nearest locked ancestor so editing
   * is restored without walking the tree in the UI.
   */
  unlockNodeForEditing(nodeId: string): void {
    if (this.isNodeLocked(nodeId)) {
      this.setNodeLocked(nodeId, false);
      return;
    }
    const ancestors = getAncestorIds(this.getScene(), nodeId);
    for (const ancestorId of ancestors) {
      if (this.isNodeLocked(ancestorId)) {
        this.setNodeLocked(ancestorId, false);
        return;
      }
    }
  }

  /** Add a registered Script component to a node (one undo step). */
  addScriptComponent(nodeId: string, scriptId: string): string {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return "";
    }
    const command = new AddScriptComponentCommand(
      this.document,
      nodeId,
      scriptId,
      this.components,
    );
    this.execute(command);
    return command.addedComponentId;
  }

  /** Add a HitZone on a 2D node (one undo step). */
  addHitZone(nodeId: string): string {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return "";
    }
    const command = new AddHitZoneCommand(this.document, nodeId);
    this.execute(command);
    return command.addedComponentId;
  }

  /** Patch HitZone fields (one undo step). */
  setHitZone(nodeId: string, patch: HitZonePatch): void {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return;
    }
    this.execute(new SetHitZoneCommand(this.document, nodeId, patch));
  }

  /** Add a Mask on a 2D node (one undo step). */
  addMask(nodeId: string): string {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return "";
    }
    const command = new AddMaskCommand(this.document, nodeId);
    this.execute(command);
    return command.addedComponentId;
  }

  /** Patch Mask fields (one undo step). */
  setMask(nodeId: string, patch: MaskPatch): void {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return;
    }
    this.execute(new SetMaskCommand(this.document, nodeId, patch));
  }

  /** Remove a Script, HitZone, or Mask component by instance id (one undo step). */
  removeComponent(nodeId: string, componentId: string): void {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return;
    }
    this.execute(
      new RemoveComponentCommand(this.document, nodeId, componentId),
    );
  }

  /**
   * Copy a Script, HitZone, or Mask onto the component clipboard.
   * Does not mutate the scene.
   */
  copyComponent(nodeId: string, componentId: string): boolean {
    const node = findNodeById(this.document.getScene(), nodeId);
    const component = node?.components.find((entry) => entry.id === componentId);
    if (!component || !isCopyableComponent(component)) {
      return false;
    }
    this.componentClipboard.copy([component]);
    this.emit();
    return true;
  }

  /**
   * Copy every Script, HitZone, and Mask on the node onto the clipboard.
   * Does not mutate the scene.
   */
  copyComponents(nodeId: string): boolean {
    const node = findNodeById(this.document.getScene(), nodeId);
    if (!node) {
      return false;
    }
    if (!this.componentClipboard.copy(listCopyableComponents(node))) {
      return false;
    }
    this.emit();
    return true;
  }

  hasCopiedComponent(): boolean {
    return this.componentClipboard.hasContent();
  }

  copiedComponentLabel(): string | undefined {
    return describeCopiedComponents(
      this.componentClipboard.templates(),
      this.components,
    );
  }

  /** Why paste is blocked on this node, or `undefined` if at least one can paste. */
  pasteComponentBlockedReason(nodeId: string): string | undefined {
    const templates = this.componentClipboard.templates();
    if (templates.length === 0) {
      return "No component on the clipboard";
    }
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return "Node is locked";
    }
    const node = findNodeById(this.document.getScene(), nodeId);
    if (!node) {
      return "Unknown node";
    }
    return pasteComponentsBlockedReason(node, templates, this.components);
  }

  canPasteComponent(nodeId: string): boolean {
    return this.pasteComponentBlockedReason(nodeId) === undefined;
  }

  /**
   * Paste copied Script / HitZone / Mask components onto a node (one undo step).
   * Skips items the target cannot accept. New component ids.
   */
  pasteComponent(nodeId: string): readonly string[] {
    if (this.pasteComponentBlockedReason(nodeId) !== undefined) {
      return [];
    }
    const node = findNodeById(this.document.getScene(), nodeId);
    if (!node) {
      return [];
    }
    const pasteable = selectPasteableComponents(
      node,
      this.componentClipboard.templates(),
      this.components,
    );
    const commands = pasteable.map(
      (template) =>
        new PasteComponentCommand(
          this.document,
          nodeId,
          template,
          this.components,
        ),
    );
    if (commands.length === 0) {
      return [];
    }
    if (commands.length === 1) {
      const command = commands[0];
      if (!command) {
        return [];
      }
      this.execute(command);
      return [command.addedComponentId];
    }
    this.execute(new CompositeCommand("PasteComponents", commands));
    return commands.map((command) => command.addedComponentId);
  }

  /** Patch Script.properties (one undo step). */
  setScriptProperties(
    nodeId: string,
    componentId: string,
    propertiesPatch: Record<string, unknown>,
  ): void {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return;
    }
    this.execute(
      new SetScriptPropertiesCommand(
        this.document,
        nodeId,
        componentId,
        propertiesPatch,
      ),
    );
  }

  /** Toggle Script.enabled (one undo step). Omitted means enabled. */
  setScriptEnabled(nodeId: string, componentId: string, enabled: boolean): void {
    if (this.isNodeEffectivelyLocked(nodeId)) {
      return;
    }
    this.execute(
      new SetScriptEnabledCommand(this.document, nodeId, componentId, enabled),
    );
  }

  selectNodes(nodeIds: readonly string[]): void {
    this.selection.setSelection(nodeIds);
  }

  selectFromVisibleList(
    orderedVisibleIds: readonly string[],
    clickedId: string,
    modifiers: ListSelectionModifiers,
  ): void {
    this.selection.applyVisibleListClick(orderedVisibleIds, clickedId, modifiers);
  }

  selectScene(): void {
    this.selection.selectScene();
  }

  toggleNodeSelection(nodeId: string): void {
    this.selection.toggleNode(nodeId);
  }

  clearSelection(): void {
    this.selection.clear();
  }

  getDirtyState(): DocumentDirtyState {
    return this.document.getDirtyState();
  }

  hasUnsavedChanges(): boolean {
    return hasUnsavedChanges(this.document.getDirtyState());
  }

  getRevision(): number {
    return this.document.getRevision();
  }

  /**
   * Monotonic UI store version. Prefer this over `getRevision()` for
   * `useSyncExternalStore` snapshots so asset catalogue / dirty / command
   * status changes also invalidate React views.
   */
  getStoreVersion(): number {
    return this.storeVersion;
  }

  getSaveError(): string | undefined {
    return this.document.getSaveError();
  }

  async saveScene(sceneFileId = this.sceneFileId): Promise<void> {
    if (this.prefabs.getMode().kind === "prefab") {
      return saveOpenPrefabDocument(this);
    }
    return saveSceneDocument(this.persistenceHost(), sceneFileId);
  }

  async loadScene(sceneFileId = this.sceneFileId): Promise<void> {
    if (this.prefabs.getMode().kind === "prefab") {
      await closePrefabDocument(this);
    }
    this.prefabs.setMode({ kind: "scene", sceneFileId });
    return loadSceneDocument(this.persistenceHost(), sceneFileId);
  }

  /**
   * Load scene JSON without replacing the editor document.
   * Used by preview Change Scene / Loading Scene navigation.
   */
  async loadSceneData(sceneFileId: string): Promise<SceneData> {
    if (!this.sceneApi) {
      throw new Error("Scene API is not configured");
    }
    return this.sceneApi.loadScene(sceneFileId);
  }

  async listScenes(): Promise<SceneListEntry[]> {
    return listSceneDocuments(this.persistenceHost());
  }

  async allocateSceneFileId(base = "untitled"): Promise<string> {
    return allocateSceneDocumentId(this.persistenceHost(), base);
  }

  async createScene(sceneFileId: string, name?: string): Promise<void> {
    return createSceneDocument(this.persistenceHost(), sceneFileId, name);
  }

  /**
   * Copies a scene file to a unique id. Does not switch the open document.
   */
  async duplicateSceneFile(sourceSceneId: string): Promise<SceneListEntry> {
    return duplicateSceneDocument(this.persistenceHost(), sourceSceneId);
  }

  /**
   * Renames the scene file on disk. If the active document is that file,
   * updates `sceneFileId` after a successful rename.
   */
  async renameSceneFile(sceneFileId: string, newSceneFileId: string): Promise<SceneListEntry> {
    const entry = await renameSceneDocumentFile(
      this.persistenceHost(),
      sceneFileId,
      newSceneFileId,
    );
    if (sceneFileId !== entry.id) {
      this.commands.record(
        new RenameSceneFileCommand(
          this.sceneFileHistoryHost(),
          sceneFileId,
          entry.id,
        ),
      );
      this.emit();
    }
    return entry;
  }

  /**
   * Deletes a scene file. If it is active, switches to `fallbackSceneId`
   * after the file is removed (caller must pick a remaining scene id).
   */
  async deleteSceneFile(sceneFileId: string, fallbackSceneId: string): Promise<void> {
    const api = this.sceneApi;
    if (!api) {
      throw new Error("Scene API client is not configured");
    }
    const wasActive = this.sceneFileId === sceneFileId;
    const snapshot = wasActive
      ? structuredClone(this.document.getScene())
      : parseSceneData(await api.loadScene(sceneFileId));
    const wasStartScene = this.project.getProject()?.startScene === sceneFileId;
    await deleteSceneDocumentFile(
      this.persistenceHost(),
      sceneFileId,
      fallbackSceneId,
    );
    this.commands.record(
      new DeleteSceneFileCommand(
        this.sceneFileHistoryHost(),
        sceneFileId,
        snapshot,
        fallbackSceneId,
        wasActive,
        wasStartScene,
      ),
    );
    this.emit();
  }

  /**
   * Renames an asset file. Stable assetId is unchanged.
   */
  async renameAsset(assetId: string, name: string): Promise<AssetRecord> {
    const before = this.assets.get(assetId);
    const asset = await this.assets.renameAsset(assetId, name);
    if (before && before.name !== asset.name) {
      this.commands.record(
        new RenameAssetCommand(
          this.assetHistoryHost(),
          assetId,
          before.name,
          asset.name,
        ),
      );
      this.emit();
    }
    return asset;
  }

  /**
   * Deletes an asset. Undo restores the same assetId and files.
   */
  async deleteAsset(assetId: string): Promise<void> {
    await this.assets.deleteAsset(assetId);
    this.commands.record(
      new DeleteAssetCommand(this.assetHistoryHost(), assetId),
    );
    this.emit();
  }

  /**
   * Copies an asset to a new id. Undo deletes that copy (same id on redo).
   */
  async duplicateAsset(
    assetId: string,
    destinationFolder?: string,
  ): Promise<AssetRecord> {
    const created = await this.assets.duplicateAsset(assetId, destinationFolder);
    this.commands.record(
      new DuplicateAssetCommand(this.assetHistoryHost(), created.id),
    );
    this.emit();
    return created;
  }

  /**
   * Renames an asset folder. Nested asset ids stay stable; paths update.
   */
  async renameFolder(folderPath: string, name: string): Promise<string> {
    const next = await this.assets.renameFolder(folderPath, name);
    if (next !== folderPath) {
      this.commands.record(
        new RenameAssetFolderCommand(this.assetHistoryHost(), folderPath, next),
      );
      this.emit();
    }
    return next;
  }

  /**
   * Deletes an asset folder. Undo restores nested files and the same asset ids.
   */
  async deleteFolder(folderPath: string): Promise<void> {
    await this.assets.deleteFolder(folderPath);
    this.commands.record(
      new DeleteAssetFolderCommand(this.assetHistoryHost(), folderPath),
    );
    this.emit();
  }

  /**
   * Opens a game project by folder id (server switches root), then reloads
   * assets and the project's start scene. Not undoable.
   */
  async openProject(projectId: string): Promise<void> {
    const { project } = await this.project.openProject(projectId);
    await this.assets.refresh({ force: true });
    await this.prefabs.refreshFromAssets(this.assets);
    await this.loadScene(project.startScene);
  }

  /**
   * Loads project manifest + assets + start scene for the server's active root.
   */
  async bootstrapActiveProject(): Promise<void> {
    const project = await this.project.refresh();
    await this.assets.refresh({ force: true });
    await this.prefabs.refreshFromAssets(this.assets);
    await this.loadScene(project.startScene);
  }

  bindEditorHotkeys(target: Window = window): () => void {
    return bindEditorHotkeys(
      {
        getDirtyState: () => this.getDirtyState(),
        sceneApiConfigured: () => this.sceneApi !== undefined,
        saveScene: () => this.saveScene(),
        undo: () => this.undo(),
        redo: () => this.redo(),
        duplicateNode: () => this.duplicateNode(),
        copySelectedNodes: () => this.copySelectedNodes(),
        pasteNodes: () => this.pasteNodes(),
        deleteSelectedNodes: () => this.deleteSelectedNodes(),
        requestRename: () => this.requestRename(),
        nudgeSelectedNodes: (deltaX, deltaY) =>
          this.nudgeSelectedNodes(deltaX, deltaY),
      },
      target,
    );
  }

  requestRename(nodeId?: string): void {
    const id = nodeId ?? this.selection.getPrimaryNodeId();
    if (id && this.isNodeEffectivelyLocked(id)) {
      return;
    }
    this.renameBus.requestRename(this.selection, nodeId);
  }

  onRenameRequest(listener: RenameRequestListener): () => void {
    return this.renameBus.onRenameRequest(listener);
  }

  /** @deprecated Prefer bindEditorHotkeys */
  bindUndoRedoHotkeys(target: Window = window): () => void {
    return this.bindEditorHotkeys(target);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispose(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers.length = 0;
    this.viewport.detach();
    this.listeners.clear();
    this.renameBus.clear();
    this.console.dispose();
  }

  private persistenceHost(): ScenePersistenceHost {
    return {
      getSceneApi: () => this.sceneApi,
      getSceneFileId: () => this.sceneFileId,
      setSceneFileId: (id) => {
        this.sceneFileId = id;
        this.syncNodeMetadataScope();
      },
      document: this.document,
      setScene: (scene, options) => this.setScene(scene, options),
      emit: () => this.emit(),
      onSceneOpened: (sceneFileId, sceneName) => {
        this.console.logSceneOpened(sceneFileId, sceneName);
      },
      syncProjectAfterSceneFileChange: async () => {
        try {
          await this.project.refresh();
        } catch {
          // Project API is optional in unit tests and demo-only hosts.
        }
      },
      restoreStartScene: async (sceneId) => {
        try {
          await this.project.setStartScene(sceneId);
        } catch {
          // Project API is optional in unit tests and demo-only hosts.
        }
      },
    };
  }

  private sceneFileHistoryHost(): SceneFileHistoryHost {
    return {
      renameSceneFileOnDisk: async (fromId, toId) => {
        await renameSceneDocumentFile(this.persistenceHost(), fromId, toId);
      },
      deleteSceneFileOnDisk: async (sceneId, fallbackSceneId, options) => {
        await deleteSceneDocumentFile(
          this.persistenceHost(),
          sceneId,
          fallbackSceneId,
          options,
        );
      },
      restoreSceneFileOnDisk: async (sceneId, snapshot, options) => {
        await restoreDeletedSceneDocument(
          this.persistenceHost(),
          sceneId,
          snapshot,
          options,
        );
      },
    };
  }

  private assetHistoryHost(): AssetHistoryHost {
    return {
      renameAssetOnDisk: async (assetId, name) => {
        await this.assets.renameAsset(assetId, name);
      },
      deleteAssetOnDisk: async (assetId) => {
        await this.assets.deleteAsset(assetId);
      },
      restoreAssetOnDisk: async (assetId) => {
        await this.assets.restoreAsset(assetId);
      },
      renameFolderOnDisk: async (folderPath, name) => {
        await this.assets.renameFolder(folderPath, name);
      },
      deleteFolderOnDisk: async (folderPath) => {
        await this.assets.deleteFolder(folderPath);
      },
      restoreFolderOnDisk: async (folderPath) => {
        await this.assets.restoreFolder(folderPath);
      },
    };
  }

  private async runAsyncHistory(direction: "undo" | "redo"): Promise<void> {
    this.historyBusy = true;
    try {
      const did =
        direction === "undo"
          ? await this.commands.undoAsync()
          : await this.commands.redoAsync();
      if (did) {
        this.afterDocumentCommand();
      }
    } finally {
      this.historyBusy = false;
      this.emit();
    }
  }

  private afterDocumentCommand(): void {
    if (this.prefabs.getMode().kind !== "prefab") {
      this.prefabs.syncOverrides(this.document);
    }
    this.document.syncDirtyFromContent();
    this.nodeMetadata.pruneMissing(this.getScene());
    this.emit();
  }

  private editorMetadataProjectId(): string {
    return (
      this.project.getActiveProjectId() ??
      this.project.getProject()?.name ??
      "local"
    );
  }

  private currentMetadataMode(): EditorDocumentMode {
    const mode = this.prefabs.getMode();
    if (mode.kind === "prefab") {
      return mode;
    }
    return { kind: "scene", sceneFileId: this.sceneFileId };
  }

  private syncNodeMetadataScope(): void {
    this.nodeMetadata.bindScope(
      this.editorMetadataProjectId(),
      this.currentMetadataMode(),
    );
  }

  private syncEditorOverlay(): void {
    const renderer = this.viewport.getRenderer();
    if (!renderer) {
      return;
    }
    applyEditorNodeOverlay(
      renderer,
      this.getScene(),
      this.nodeMetadata.getSnapshot(),
    );
  }

  private emit(): void {
    this.storeVersion += 1;
    for (const listener of this.listeners) {
      listener();
    }
  }
}
