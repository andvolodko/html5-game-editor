import {
  createEmptyScene,
  findNodeById,
  flattenSubtree,
  getSprite,
  getTransform2D,
  getTransform3D,
  getVisualComponent,
  insertNodeInScene,
  moveNodeInScene,
  detachNodeFromScene,
  getNodeLocation,
  type ComponentData,
  type Model3DComponentData,
  type SceneData,
  type SceneNodeData,
  type ScriptComponentData,
  type ThreeComponentData,
  type Transform2DComponentData,
  type Transform3DComponentData,
  type VisualComponentData,
  type PrefabInstanceLink,
  type PrefabOverride,
} from "@game-editor/scene";

export type DocumentDirtyState = "clean" | "dirty" | "saving" | "save-error";

export interface DocumentContentSnapshot {
  scene: SceneData;
  savedSnapshot: string;
  dirtyState: DocumentDirtyState;
  saveError: string | undefined;
}

/** True when leaving/reloading the document would discard unpersisted edits. */
export function hasUnsavedChanges(state: DocumentDirtyState): boolean {
  return state === "dirty" || state === "save-error";
}

export type SceneMutation =
  | { kind: "create"; nodeId: string }
  | {
      kind: "update";
      nodeId: string;
      /** Defaults to full visual refresh when omitted. */
      reason?: "transform" | "visual" | "metadata";
    }
  | { kind: "destroy"; nodeId: string }
  | {
      kind: "move";
      nodeId: string;
      parentId: string | undefined;
      index: number;
    }
  /** Scene document metadata (name, future settings) — not a node. */
  | { kind: "scene-meta" }
  | { kind: "reload" };

export type DocumentListener = (mutation: SceneMutation | { kind: "state" }) => void;

/**
 * Owns the editable scene document. Commands mutate through this API only —
 * there is no public mutable scene escape hatch.
 */
export class DocumentManager {
  private scene: SceneData;
  private revision = 0;
  private savedSnapshot: string;
  private dirtyState: DocumentDirtyState = "clean";
  private saveError: string | undefined;
  private readonly listeners = new Set<DocumentListener>();

  constructor(scene: SceneData = createEmptyScene("Main Scene")) {
    this.scene = scene;
    this.savedSnapshot = stableSceneSnapshot(scene);
  }

  getScene(): SceneData {
    return this.scene;
  }

  getRevision(): number {
    return this.revision;
  }

  getDirtyState(): DocumentDirtyState {
    return this.dirtyState;
  }

  getSaveError(): string | undefined {
    return this.saveError;
  }

  subscribe(listener: DocumentListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  captureSnapshot(): DocumentContentSnapshot {
    return {
      scene: JSON.parse(JSON.stringify(this.scene)) as SceneData,
      savedSnapshot: this.savedSnapshot,
      dirtyState: this.dirtyState,
      saveError: this.saveError,
    };
  }

  restoreSnapshot(snapshot: DocumentContentSnapshot): void {
    this.scene = snapshot.scene;
    this.savedSnapshot = snapshot.savedSnapshot;
    this.dirtyState = snapshot.dirtyState;
    this.saveError = snapshot.saveError;
    this.revision += 1;
    this.emit({ kind: "reload" });
  }

  /** Replace the whole document (e.g. load). Marks clean. */
  replaceScene(scene: SceneData): void {
    this.scene = scene;
    this.revision += 1;
    this.savedSnapshot = stableSceneSnapshot(scene);
    this.dirtyState = "clean";
    this.saveError = undefined;
    this.emit({ kind: "reload" });
  }

  addRootNode(node: SceneNodeData): void {
    this.insertNode(node, undefined, this.scene.nodes.length);
  }

  /**
   * Insert a node (subtree) under parent. Emits a single `create` for the root;
   * the viewport walks the subtree incrementally.
   */
  insertNode(
    node: SceneNodeData,
    parentId: string | undefined,
    index: number,
  ): void {
    insertNodeInScene(this.scene, node, parentId, index);
    this.afterContentMutation({ kind: "create", nodeId: node.id });
  }

  /**
   * Replace a node object in-place (same parent/index). Used by unpack / prefab refresh.
   * Emits destroy + create so the viewport rebuilds the subtree once.
   */
  replaceNodeSubtree(nodeId: string, next: SceneNodeData): void {
    const location = getNodeLocation(this.scene, nodeId);
    if (!location) {
      throw new Error(`DocumentManager: unknown node ${nodeId}`);
    }
    detachNodeFromScene(this.scene, nodeId);
    this.emit({ kind: "destroy", nodeId });
    insertNodeInScene(this.scene, next, location.parentId, location.index);
    this.afterContentMutation({ kind: "create", nodeId: next.id });
  }

  setPrefabLink(nodeId: string, prefab: PrefabInstanceLink | undefined): void {
    const node = findNodeById(this.scene, nodeId);
    if (!node) {
      throw new Error(`DocumentManager: unknown node ${nodeId}`);
    }
    if (prefab === undefined) {
      delete node.prefab;
    } else {
      node.prefab = prefab;
    }
    this.afterContentMutation({
      kind: "update",
      nodeId,
      reason: "metadata",
    });
  }

  setPrefabOverrides(nodeId: string, overrides: PrefabOverride[]): void {
    const node = findNodeById(this.scene, nodeId);
    if (!node?.prefab) {
      throw new Error(`DocumentManager: node ${nodeId} is not a prefab instance`);
    }
    if (overrides.length === 0) {
      delete node.prefab.overrides;
    } else {
      node.prefab.overrides = overrides;
    }
    this.afterContentMutation({
      kind: "update",
      nodeId,
      reason: "metadata",
    });
  }

  removeNode(nodeId: string): boolean {
    if (!findNodeById(this.scene, nodeId)) {
      return false;
    }
    detachNodeFromScene(this.scene, nodeId);
    this.afterContentMutation({ kind: "destroy", nodeId });
    return true;
  }

  renameNode(nodeId: string, name: string): void {
    const node = findNodeById(this.scene, nodeId);
    if (!node) {
      throw new Error(`DocumentManager: unknown node ${nodeId}`);
    }
    node.name = name;
    this.afterContentMutation({
      kind: "update",
      nodeId,
      reason: "metadata",
    });
  }

  /** Rename the open scene document (not a hierarchy node). */
  renameScene(name: string): void {
    this.scene.name = name;
    this.afterContentMutation({ kind: "scene-meta" });
  }

  applyTransform2D(nodeId: string, values: Transform2DComponentData): void {
    const node = findNodeById(this.scene, nodeId);
    const transform = node ? getTransform2D(node) : undefined;
    if (!transform) {
      throw new Error(`DocumentManager: node ${nodeId} missing Transform2D`);
    }

    transform.position = { ...values.position };
    transform.rotation = values.rotation;
    transform.scale = { ...values.scale };
    if (values.anchor !== undefined) {
      transform.anchor = { ...values.anchor };
    } else {
      delete transform.anchor;
    }
    if (values.skew !== undefined) {
      transform.skew = { ...values.skew };
    } else {
      delete transform.skew;
    }

    this.afterContentMutation({
      kind: "update",
      nodeId,
      reason: "transform",
    });
  }

  applyTransform3D(nodeId: string, values: Transform3DComponentData): void {
    const node = findNodeById(this.scene, nodeId);
    const transform = node ? getTransform3D(node) : undefined;
    if (!transform) {
      throw new Error(`DocumentManager: node ${nodeId} missing Transform3D`);
    }

    transform.position = { ...values.position };
    transform.rotation = { ...values.rotation };
    transform.scale = { ...values.scale };

    this.afterContentMutation({
      kind: "update",
      nodeId,
      reason: "transform",
    });
  }

  applyModel3D(nodeId: string, values: Model3DComponentData): void {
    this.applyThreeComponent(nodeId, values);
  }

  /** Replace a Three leaf component (Model3D / camera / light) in-place. */
  applyThreeComponent(nodeId: string, values: ThreeComponentData): void {
    const node = findNodeById(this.scene, nodeId);
    if (!node) {
      throw new Error(`DocumentManager: unknown node ${nodeId}`);
    }
    const index = node.components.findIndex((c) => c.type === values.type);
    if (index < 0) {
      throw new Error(
        `DocumentManager: node ${nodeId} missing ${values.type}`,
      );
    }
    const existing = node.components[index];
    if (!existing || existing.id !== values.id) {
      throw new Error(
        `DocumentManager: ${values.type} identity mismatch on ${nodeId}`,
      );
    }
    node.components[index] = structuredClone(values);

    this.afterContentMutation({
      kind: "update",
      nodeId,
      reason: "visual",
    });
  }

  setSceneRenderer(renderer: "pixi" | "three" | "hybrid" | undefined): void {
    if (renderer === undefined) {
      delete this.scene.renderer;
    } else {
      this.scene.renderer = renderer;
    }
    this.afterContentMutation({ kind: "scene-meta" });
  }

  setNodeLayer(
    nodeId: string,
    layer: "background" | "foreground" | undefined,
  ): void {
    const node = findNodeById(this.scene, nodeId);
    if (!node) {
      throw new Error(`DocumentManager: unknown node ${nodeId}`);
    }
    if (layer === undefined || layer === "background") {
      delete node.layer;
    } else {
      node.layer = layer;
    }
    this.afterContentMutation({
      kind: "update",
      nodeId,
      reason: "visual",
    });
  }

  applySpriteSize(
    nodeId: string,
    size: { width: number; height: number },
  ): void {
    const node = findNodeById(this.scene, nodeId);
    const sprite = node ? getSprite(node) : undefined;
    if (!sprite) {
      throw new Error(`DocumentManager: node ${nodeId} missing Sprite`);
    }

    sprite.width = size.width;
    sprite.height = size.height;

    this.afterContentMutation({
      kind: "update",
      nodeId,
      reason: "visual",
    });
  }

  /** Append or insert a component on a node (Script add-component flow). */
  addComponent(
    nodeId: string,
    component: ComponentData,
    index?: number,
  ): void {
    const node = findNodeById(this.scene, nodeId);
    if (!node) {
      throw new Error(`DocumentManager: unknown node ${nodeId}`);
    }
    if (node.components.some((c) => c.id === component.id)) {
      throw new Error(
        `DocumentManager: duplicate component id ${component.id} on ${nodeId}`,
      );
    }
    const clone = structuredClone(component);
    if (index === undefined) {
      node.components.push(clone);
    } else {
      const clamped = Math.max(0, Math.min(index, node.components.length));
      node.components.splice(clamped, 0, clone);
    }
    this.afterContentMutation({
      kind: "update",
      nodeId,
      reason: "metadata",
    });
  }

  /**
   * Remove a Script component by id. Transform / visual components are not
   * removable through this API.
   */
  removeComponent(nodeId: string, componentId: string): void {
    const node = findNodeById(this.scene, nodeId);
    if (!node) {
      throw new Error(`DocumentManager: unknown node ${nodeId}`);
    }
    const index = node.components.findIndex((c) => c.id === componentId);
    const component = index >= 0 ? node.components[index] : undefined;
    if (!component || component.type !== "Script") {
      throw new Error(
        `DocumentManager: node ${nodeId} missing Script component ${componentId}`,
      );
    }
    node.components.splice(index, 1);
    this.afterContentMutation({
      kind: "update",
      nodeId,
      reason: "metadata",
    });
  }

  /** Replace a Script component in-place (same id / scriptId). */
  applyScriptComponent(nodeId: string, values: ScriptComponentData): void {
    const node = findNodeById(this.scene, nodeId);
    if (!node) {
      throw new Error(`DocumentManager: unknown node ${nodeId}`);
    }
    const index = node.components.findIndex((c) => c.id === values.id);
    const current = index >= 0 ? node.components[index] : undefined;
    if (!current || current.type !== "Script") {
      throw new Error(
        `DocumentManager: node ${nodeId} missing Script component ${values.id}`,
      );
    }
    if (current.scriptId !== values.scriptId) {
      throw new Error(
        `DocumentManager: scriptId mismatch on ${nodeId}/${values.id}`,
      );
    }
    node.components[index] = structuredClone(values);
    this.afterContentMutation({
      kind: "update",
      nodeId,
      reason: "metadata",
    });
  }

  /** Replace the node's leaf visual component in-place (same component id/type). */
  applyVisualComponent(nodeId: string, values: VisualComponentData): void {
    const node = findNodeById(this.scene, nodeId);
    const visual = node ? getVisualComponent(node) : undefined;
    if (!node || !visual) {
      throw new Error(
        `DocumentManager: node ${nodeId} missing visual component`,
      );
    }
    if (visual.type !== values.type || visual.id !== values.id) {
      throw new Error(
        `DocumentManager: visual component identity mismatch on ${nodeId}`,
      );
    }

    const index = node.components.findIndex(
      (component) => component.id === visual.id,
    );
    if (index < 0) {
      throw new Error(
        `DocumentManager: visual component missing from ${nodeId}`,
      );
    }
    node.components[index] = structuredClone(values);

    this.afterContentMutation({
      kind: "update",
      nodeId,
      reason: "visual",
    });
  }

  /**
   * Reparent/reorder a node. Optional `transformAfter` is applied after the move
   * (used to preserve world pose). Emits a single `move` mutation.
   */
  moveNode(
    nodeId: string,
    toParentId: string | undefined,
    toIndex: number,
    transformAfter?: Transform2DComponentData,
  ): void {
    const result = moveNodeInScene(this.scene, nodeId, toParentId, toIndex);
    if (transformAfter) {
      const node = findNodeById(this.scene, nodeId);
      const transform = node ? getTransform2D(node) : undefined;
      if (!transform) {
        throw new Error(`DocumentManager: node ${nodeId} missing Transform2D`);
      }
      transform.position = { ...transformAfter.position };
      transform.rotation = transformAfter.rotation;
      transform.scale = { ...transformAfter.scale };
      if (transformAfter.anchor !== undefined) {
        transform.anchor = { ...transformAfter.anchor };
      } else {
        delete transform.anchor;
      }
    }
    this.afterContentMutation({
      kind: "move",
      nodeId,
      parentId: result.toParentId,
      index: result.toIndex,
    });
  }

  beginSave(): void {
    this.dirtyState = "saving";
    this.saveError = undefined;
    this.emit({ kind: "state" });
  }

  markSaved(savedScene?: SceneData): void {
    if (savedScene !== undefined) {
      this.scene = savedScene;
    }
    this.savedSnapshot = stableSceneSnapshot(this.scene);
    this.dirtyState = "clean";
    this.saveError = undefined;
    this.emit({ kind: "state" });
  }

  failSave(message: string): void {
    this.dirtyState = "save-error";
    this.saveError = message;
    this.emit({ kind: "state" });
  }

  /**
   * Recompute dirty by comparing current scene to last saved snapshot.
   * Enables undo back to a clean document.
   */
  syncDirtyFromContent(): void {
    if (this.dirtyState === "saving") {
      return;
    }
    const matches = stableSceneSnapshot(this.scene) === this.savedSnapshot;
    this.dirtyState = matches ? "clean" : "dirty";
    if (matches) {
      this.saveError = undefined;
    }
    this.emit({ kind: "state" });
  }

  listSubtreeIds(nodeId: string): string[] {
    const node = findNodeById(this.scene, nodeId);
    return node ? flattenSubtree(node).map((n) => n.id) : [];
  }

  private afterContentMutation(mutation: SceneMutation): void {
    this.revision += 1;
    if (this.dirtyState !== "saving") {
      this.dirtyState = "dirty";
      this.saveError = undefined;
    }
    this.emit(mutation);
  }

  private emit(mutation: SceneMutation | { kind: "state" }): void {
    for (const listener of this.listeners) {
      listener(mutation);
    }
  }
}

function stableSceneSnapshot(scene: SceneData): string {
  return JSON.stringify(scene);
}
