import {
  createEmptyScene,
  flattenSubtree,
  getSprite,
  getTransform2D,
  getTransform3D,
  getVisualComponent,
  getHitZone,
  getMask,
  getTilemap,
  applyTileChanges,
  insertNodeInScene,
  moveNodeInScene,
  detachNodeFromScene,
  getNodeLocation,
  setNodeVisibleField,
  setNodeAlphaField,
  setNodePointerEventModeField,
  setNodeCursorField,
  setNodePointerChildrenField,
  type ComponentData,
  type Model3DComponentData,
  type SceneData,
  type SceneNodeData,
  type ScriptComponentData,
  type ThreeComponentData,
  type Transform2DComponentData,
  type Transform3DComponentData,
  type VisualComponentData,
  type HitZoneComponentData,
  type MaskComponentData,
  type TileChange,
  type PrefabInstanceLink,
  type PrefabOverride,
  type NodePointerEventMode,
  SceneIndex,
} from "@game-editor/scene";
import {
  replaceComponentInPlace,
  requireDocumentNode,
} from "./document-component-apply.js";
import {
  DocumentDirtyTracker,
  type DocumentContentSnapshot,
  type DocumentDirtyState,
} from "./document-dirty.js";

export {
  hasUnsavedChanges,
  type DocumentContentSnapshot,
  type DocumentDirtyState,
} from "./document-dirty.js";

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
  private readonly sceneIndex = new SceneIndex();
  private revision = 0;
  private readonly dirty: DocumentDirtyTracker;
  private readonly listeners = new Set<DocumentListener>();

  constructor(scene: SceneData = createEmptyScene("Main Scene")) {
    this.scene = scene;
    this.sceneIndex.rebuild(scene);
    this.dirty = new DocumentDirtyTracker(scene);
  }

  getScene(): SceneData {
    return this.scene;
  }

  getNode(nodeId: string): SceneNodeData | undefined {
    return this.sceneIndex.getNode(nodeId);
  }

  getRevision(): number {
    return this.revision;
  }

  getDirtyState(): DocumentDirtyState {
    return this.dirty.dirtyState;
  }

  getSaveError(): string | undefined {
    return this.dirty.saveError;
  }

  subscribe(listener: DocumentListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  captureSnapshot(): DocumentContentSnapshot {
    return this.dirty.capture(this.scene);
  }

  restoreSnapshot(snapshot: DocumentContentSnapshot): void {
    this.scene = snapshot.scene;
    this.sceneIndex.rebuild(snapshot.scene);
    this.dirty.restore(snapshot);
    this.revision += 1;
    this.emit({ kind: "reload" });
  }

  /** Replace the whole document (e.g. load). Marks clean. */
  replaceScene(scene: SceneData): void {
    this.scene = scene;
    this.sceneIndex.rebuild(scene);
    this.revision += 1;
    this.dirty.markClean(scene);
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
    this.sceneIndex.addNode(node);
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
    this.sceneIndex.removeNode(nodeId);
    this.emit({ kind: "destroy", nodeId });
    insertNodeInScene(this.scene, next, location.parentId, location.index);
    this.sceneIndex.addNode(next);
    this.afterContentMutation({ kind: "create", nodeId: next.id });
  }

  setPrefabLink(nodeId: string, prefab: PrefabInstanceLink | undefined): void {
    const node = requireDocumentNode(this.sceneIndex.getNode(nodeId), nodeId);
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
    const node = requireDocumentNode(this.sceneIndex.getNode(nodeId), nodeId);
    if (!node.prefab) {
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
    if (!this.sceneIndex.hasNode(nodeId)) {
      return false;
    }
    detachNodeFromScene(this.scene, nodeId);
    this.sceneIndex.removeNode(nodeId);
    this.afterContentMutation({ kind: "destroy", nodeId });
    return true;
  }

  renameNode(nodeId: string, name: string): void {
    const node = requireDocumentNode(this.sceneIndex.getNode(nodeId), nodeId);
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
    const node = this.sceneIndex.getNode(nodeId);
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
    const node = this.sceneIndex.getNode(nodeId);
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
    const node = requireDocumentNode(this.sceneIndex.getNode(nodeId), nodeId);
    replaceComponentInPlace(node, values, {
      find: (component) => component.type === values.type,
      missing: `DocumentManager: node ${nodeId} missing ${values.type}`,
      mismatch: `DocumentManager: ${values.type} identity mismatch on ${nodeId}`,
    });

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
    const node = requireDocumentNode(this.sceneIndex.getNode(nodeId), nodeId);
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

  setNodeVisible(nodeId: string, visible: boolean): void {
    const node = requireDocumentNode(this.sceneIndex.getNode(nodeId), nodeId);
    setNodeVisibleField(node, visible);
    this.afterContentMutation({
      kind: "update",
      nodeId,
      reason: "visual",
    });
  }

  setNodeAlpha(nodeId: string, alpha: number): void {
    const node = requireDocumentNode(this.sceneIndex.getNode(nodeId), nodeId);
    setNodeAlphaField(node, alpha);
    this.afterContentMutation({
      kind: "update",
      nodeId,
      reason: "visual",
    });
  }

  setNodePointer(
    nodeId: string,
    patch: {
      eventMode?: NodePointerEventMode;
      cursor?: string;
      children?: boolean;
    },
  ): void {
    const node = requireDocumentNode(this.sceneIndex.getNode(nodeId), nodeId);
    if (patch.eventMode !== undefined) {
      setNodePointerEventModeField(node, patch.eventMode);
    }
    if (patch.cursor !== undefined) {
      setNodeCursorField(node, patch.cursor);
    }
    if (patch.children !== undefined) {
      setNodePointerChildrenField(node, patch.children);
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
    const node = this.sceneIndex.getNode(nodeId);
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
    const node = requireDocumentNode(this.sceneIndex.getNode(nodeId), nodeId);
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
   * Remove a Script, HitZone, or Mask component by id. Transform / visual /
   * Three leaves are not removable through this API.
   */
  removeComponent(nodeId: string, componentId: string): void {
    const node = requireDocumentNode(this.sceneIndex.getNode(nodeId), nodeId);
    const index = node.components.findIndex((c) => c.id === componentId);
    const component = index >= 0 ? node.components[index] : undefined;
    if (
      !component ||
      (component.type !== "Script" &&
        component.type !== "HitZone" &&
        component.type !== "Mask")
    ) {
      throw new Error(
        `DocumentManager: node ${nodeId} missing removable component ${componentId}`,
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
    const node = requireDocumentNode(this.sceneIndex.getNode(nodeId), nodeId);
    replaceComponentInPlace(node, values, {
      find: (component) => component.id === values.id,
      missing: `DocumentManager: node ${nodeId} missing Script component ${values.id}`,
      mismatch: `DocumentManager: node ${nodeId} missing Script component ${values.id}`,
      validate: (existing) => {
        if (existing.type !== "Script") {
          throw new Error(
            `DocumentManager: node ${nodeId} missing Script component ${values.id}`,
          );
        }
        if (existing.scriptId !== values.scriptId) {
          throw new Error(
            `DocumentManager: scriptId mismatch on ${nodeId}/${values.id}`,
          );
        }
      },
    });
    this.afterContentMutation({
      kind: "update",
      nodeId,
      reason: "metadata",
    });
  }

  /** Replace a HitZone component in-place (same id). */
  applyHitZoneComponent(nodeId: string, values: HitZoneComponentData): void {
    const node = requireDocumentNode(this.sceneIndex.getNode(nodeId), nodeId);
    const hitZone = getHitZone(node);
    if (!hitZone) {
      throw new Error(`DocumentManager: node ${nodeId} missing HitZone`);
    }
    replaceComponentInPlace(node, values, {
      find: (component) => component.id === hitZone.id,
      missing: `DocumentManager: HitZone missing from ${nodeId}`,
      mismatch: `DocumentManager: HitZone identity mismatch on ${nodeId}`,
    });
    this.afterContentMutation({
      kind: "update",
      nodeId,
      reason: "visual",
    });
  }

  /** Replace a Mask component in-place (same id). */
  applyMaskComponent(nodeId: string, values: MaskComponentData): void {
    const node = requireDocumentNode(this.sceneIndex.getNode(nodeId), nodeId);
    const mask = getMask(node);
    if (!mask) {
      throw new Error(`DocumentManager: node ${nodeId} missing Mask`);
    }
    replaceComponentInPlace(node, values, {
      find: (component) => component.id === mask.id,
      missing: `DocumentManager: Mask missing from ${nodeId}`,
      mismatch: `DocumentManager: Mask identity mismatch on ${nodeId}`,
    });
    this.afterContentMutation({
      kind: "update",
      nodeId,
      reason: "visual",
    });
  }

  /** Replace the node's leaf visual component in-place (same component id/type). */
  applyVisualComponent(nodeId: string, values: VisualComponentData): void {
    const node = requireDocumentNode(this.sceneIndex.getNode(nodeId), nodeId);
    const visual = getVisualComponent(node);
    if (!visual) {
      throw new Error(
        `DocumentManager: node ${nodeId} missing visual component`,
      );
    }
    if (visual.type !== values.type) {
      throw new Error(
        `DocumentManager: visual component identity mismatch on ${nodeId}`,
      );
    }
    replaceComponentInPlace(node, values, {
      find: (component) => component.id === visual.id,
      missing: `DocumentManager: visual component missing from ${nodeId}`,
      mismatch: `DocumentManager: visual component identity mismatch on ${nodeId}`,
    });

    this.afterContentMutation({
      kind: "update",
      nodeId,
      reason: "visual",
    });
  }

  /**
   * Apply sparse tile cell changes without cloning the whole Tilemap.
   */
  applyTilemapChanges(
    nodeId: string,
    changes: readonly TileChange[],
    field: "before" | "after",
  ): void {
    const node = this.sceneIndex.getNode(nodeId);
    const tilemap = node ? getTilemap(node) : undefined;
    if (!node || !tilemap) {
      throw new Error(`DocumentManager: node ${nodeId} is not a Tilemap`);
    }
    applyTileChanges(tilemap, changes, field);
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
    this.sceneIndex.reparentNode(nodeId, result.toParentId);
    if (transformAfter) {
      const node = this.sceneIndex.getNode(nodeId);
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
    this.dirty.beginSave();
    this.emit({ kind: "state" });
  }

  markSaved(savedScene?: SceneData): void {
    if (savedScene !== undefined) {
      this.scene = savedScene;
      this.sceneIndex.rebuild(savedScene);
    }
    this.dirty.markClean(this.scene);
    this.emit({ kind: "state" });
  }

  failSave(message: string): void {
    this.dirty.failSave(message);
    this.emit({ kind: "state" });
  }

  /**
   * Recompute dirty by comparing current scene to last saved snapshot.
   * Enables undo back to a clean document.
   */
  syncDirtyFromContent(): void {
    if (!this.dirty.syncFromContent(this.scene)) {
      return;
    }
    this.emit({ kind: "state" });
  }

  listSubtreeIds(nodeId: string): string[] {
    const node = this.sceneIndex.getNode(nodeId);
    return node ? flattenSubtree(node).map((n) => n.id) : [];
  }

  private afterContentMutation(mutation: SceneMutation): void {
    this.revision += 1;
    this.dirty.markDirtyUnlessSaving();
    this.emit(mutation);
  }

  private emit(mutation: SceneMutation | { kind: "state" }): void {
    for (const listener of this.listeners) {
      listener(mutation);
    }
  }
}
