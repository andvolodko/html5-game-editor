import { humanizeAssetNodeName } from "@game-editor/assets";
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
  getTransform2D,
  type SceneData,
  type SceneRenderer,
  type Vec2,
} from "@game-editor/scene";
import {
  CreateSpriteCommand,
  CreateSpineCommand,
  CreateNodeCommand,
  DeleteNodeCommand,
  DuplicateNodeCommand,
  MoveNodeCommand,
  RenameNodeCommand,
  SetSceneNameCommand,
  SetTransform2DCommand,
  SetSpriteSizeCommand,
  SetVisualComponentCommand,
  AddScriptComponentCommand,
  RemoveComponentCommand,
  SetScriptPropertiesCommand,
  createDeleteSelectionCommand,
  type CreateSpriteOptions,
  type CreateNodeOptions,
  type Transform2DPatch,
  type SpriteSizePatch,
} from "./commands/index.js";
import {
  ensureDefaultNodeTypesRegistered,
  type NodeTypeId,
  type NodeTypeRegistry,
} from "./node-types/index.js";
import {
  DocumentManager,
  hasUnsavedChanges,
  type DocumentDirtyState,
} from "./document-manager.js";
import type { SceneApiClient, SceneListEntry } from "./scene-api-client.js";
import { SelectionManager } from "./selection-manager.js";
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
import {
  allocateSceneDocumentId,
  createSceneDocument,
  deleteSceneDocumentFile,
  listSceneDocuments,
  loadSceneDocument,
  renameSceneDocumentFile,
  saveSceneDocument,
  type ScenePersistenceHost,
} from "./editor-scene-persistence.js";
import { RenameRequestBus, type RenameRequestListener } from "./rename-request-bus.js";

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
  /** Bus event ids for dynamicEnum source `busEvents` (set when loading game catalog). */
  private busEvents: readonly BusEventDefinition[] = [];

  private sceneFileId: string;
  private sceneApi: SceneApiClient | undefined;
  private componentCatalogApi: ComponentCatalogApiClient | undefined;
  private readonly listeners = new Set<Listener>();
  private readonly renameBus = new RenameRequestBus();
  private readonly unsubscribers: Array<() => void> = [];
  /** Bumps on every façade emit (document, selection, assets, dirty, …). */
  private storeVersion = 0;

  constructor(options: EditorOptions = {}) {
    this.document = new DocumentManager(
      options.scene ?? createEmptyScene("Main Scene"),
    );
    this.selection = new SelectionManager();
    this.commands = new CommandManager();
    this.viewport = new EditorViewportController(this.document);
    this.assets = new AssetManager(options.assetApi);
    this.project = new ProjectManager(options.projectApi);
    this.components = new ComponentRegistry();
    this.sceneFileId = options.sceneFileId ?? "main";
    this.sceneApi = options.sceneApi;
    this.componentCatalogApi = options.componentCatalogApi;

    this.unsubscribers.push(
      this.document.subscribe((event) => {
        // Domain reload must drop undo history — commands hold live node graphs.
        if (event.kind === "reload") {
          this.commands.clear();
        }
        this.emit();
      }),
      this.selection.subscribe(() => this.emit()),
      this.assets.subscribe(() => this.emit()),
      this.project.subscribe(() => this.emit()),
    );
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

  setScene(scene: SceneData): void {
    this.selection.clear();
    // Clear before replace so reload handler is idempotent.
    this.commands.clear();
    this.document.replaceScene(scene);
  }

  attachRenderer(renderer: SceneRenderer): void {
    this.viewport.attach(renderer);
  }

  detachRenderer(): void {
    this.viewport.detach();
  }

  execute(command: Command): void {
    this.commands.execute(command);
    this.document.syncDirtyFromContent();
    this.emit();
  }

  undo(): boolean {
    const did = this.commands.undo();
    if (did) {
      this.document.syncDirtyFromContent();
      this.emit();
    }
    return did;
  }

  redo(): boolean {
    const did = this.commands.redo();
    if (did) {
      this.document.syncDirtyFromContent();
      this.emit();
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
    if (asset?.metadata.kind === "texture") {
      options.width = asset.metadata.width;
      options.height = asset.metadata.height;
    }
    const command = new CreateSpriteCommand(
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
    this.execute(new RenameNodeCommand(this.document, nodeId, name));
  }

  renameScene(name: string): void {
    this.execute(new SetSceneNameCommand(this.document, name));
  }

  duplicateNode(nodeId?: string): string | undefined {
    const id = nodeId ?? this.selection.getPrimaryNodeId();
    if (!id) {
      return undefined;
    }
    const command = new DuplicateNodeCommand(
      this.document,
      this.selection,
      id,
    );
    this.execute(command);
    return command.createdNodeId;
  }

  deleteSelectedNodes(): void {
    const command = createDeleteSelectionCommand(this.document, this.selection);
    if (!command) {
      return;
    }
    this.execute(command);
  }

  deleteNode(nodeId: string): void {
    this.execute(new DeleteNodeCommand(this.document, this.selection, nodeId));
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
  }

  setTransform2D(nodeId: string, patch: Transform2DPatch): void {
    this.execute(new SetTransform2DCommand(this.document, nodeId, patch));
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
      if (!transform) {
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
    this.execute(new SetSpriteSizeCommand(this.document, nodeId, patch));
  }

  /** Patch the node's leaf visual component (one undo step). */
  setVisualComponent(nodeId: string, patch: Record<string, unknown>): void {
    this.execute(new SetVisualComponentCommand(this.document, nodeId, patch));
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

  /** Add a registered Script component to a node (one undo step). */
  addScriptComponent(nodeId: string, scriptId: string): string {
    const command = new AddScriptComponentCommand(
      this.document,
      nodeId,
      scriptId,
      this.components,
    );
    this.execute(command);
    return command.addedComponentId;
  }

  /** Remove a Script component by instance id (one undo step). */
  removeComponent(nodeId: string, componentId: string): void {
    this.execute(
      new RemoveComponentCommand(this.document, nodeId, componentId),
    );
  }

  /** Patch Script.properties (one undo step). */
  setScriptProperties(
    nodeId: string,
    componentId: string,
    propertiesPatch: Record<string, unknown>,
  ): void {
    this.execute(
      new SetScriptPropertiesCommand(
        this.document,
        nodeId,
        componentId,
        propertiesPatch,
      ),
    );
  }

  selectNodes(nodeIds: readonly string[]): void {
    this.selection.setSelection(nodeIds);
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
    return saveSceneDocument(this.persistenceHost(), sceneFileId);
  }

  async loadScene(sceneFileId = this.sceneFileId): Promise<void> {
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
   * Renames the scene file on disk. If the active document is that file,
   * updates `sceneFileId` after a successful rename.
   */
  async renameSceneFile(sceneFileId: string, newSceneFileId: string): Promise<SceneListEntry> {
    return renameSceneDocumentFile(
      this.persistenceHost(),
      sceneFileId,
      newSceneFileId,
    );
  }

  /**
   * Deletes a scene file. If it is active, switches to `fallbackSceneId` first
   * after the file is removed (caller must pick a remaining scene id).
   */
  async deleteSceneFile(sceneFileId: string, fallbackSceneId: string): Promise<void> {
    return deleteSceneDocumentFile(
      this.persistenceHost(),
      sceneFileId,
      fallbackSceneId,
    );
  }

  /**
   * Opens a game project by folder id (server switches root), then reloads
   * assets and the project's start scene. Not undoable.
   */
  async openProject(projectId: string): Promise<void> {
    const { project } = await this.project.openProject(projectId);
    await this.assets.refresh({ force: true });
    await this.loadScene(project.startScene);
  }

  /**
   * Loads project manifest + assets + start scene for the server's active root.
   */
  async bootstrapActiveProject(): Promise<void> {
    const project = await this.project.refresh();
    await this.assets.refresh({ force: true });
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
        deleteSelectedNodes: () => this.deleteSelectedNodes(),
        requestRename: () => this.requestRename(),
        nudgeSelectedNodes: (deltaX, deltaY) =>
          this.nudgeSelectedNodes(deltaX, deltaY),
      },
      target,
    );
  }

  requestRename(nodeId?: string): void {
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
  }

  private persistenceHost(): ScenePersistenceHost {
    return {
      getSceneApi: () => this.sceneApi,
      getSceneFileId: () => this.sceneFileId,
      setSceneFileId: (id) => {
        this.sceneFileId = id;
      },
      document: this.document,
      setScene: (scene) => this.setScene(scene),
      emit: () => this.emit(),
    };
  }

  private emit(): void {
    this.storeVersion += 1;
    for (const listener of this.listeners) {
      listener();
    }
  }
}
