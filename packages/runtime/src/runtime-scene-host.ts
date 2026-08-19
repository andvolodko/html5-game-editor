import type {
  ScriptAnimatedSpritePlaybackPatch,
  ScriptModel3DPlaybackPatch,
  ScriptSpawnModel3DOptions,
  ScriptTransform2DPatch,
  ScriptTransform3DPatch,
} from "@game-editor/game-components";
import {
  canMoveNode,
  flattenNodes,
  flattenSubtree,
  moveNodeInScene,
  resolveScenePrefabs,
  SceneIndex,
  type PrefabCatalog,
  type SceneData,
  type SceneNodeData,
  type SceneRenderer,
} from "@game-editor/scene";
import { cloneNamedNodeInScene } from "./script-scene-clone.js";
import {
  patchAnimatedSpritePlayback,
  patchModel3DPlayback,
  patchNodeText,
  patchSpriteAssetId,
  patchTransform2D,
  patchTransform3D,
} from "./script-scene-io.js";
import { destroyNodeInScene, spawnModel3DInScene } from "./script-scene-spawn.js";
import type { RuntimeRendererHost } from "./runtime-renderer-host.js";

/**
 * Live scene graph, index, and renderer sync for script mutations.
 * GameRuntime stays the public façade and owns tick / render / scripts.
 */
export class RuntimeSceneHost {
  readonly sceneIndex = new SceneIndex();
  private scene: SceneData | undefined;
  private prefabs: PrefabCatalog;
  private readonly spawnedNodeIds = new Set<string>();

  constructor(private readonly rendererHost: RuntimeRendererHost) {
    this.prefabs = new Map();
  }

  setPrefabCatalog(prefabs: PrefabCatalog): void {
    this.prefabs = prefabs;
  }

  getScene(): SceneData | undefined {
    return this.scene;
  }

  /**
   * Resolve prefabs, rebuild the index, and recreate renderer nodes.
   * Returns the resolved scene for ScriptHost.attachScene.
   */
  loadScene(scene: SceneData): SceneData {
    this.spawnedNodeIds.clear();
    const { scene: resolved, warnings } = resolveScenePrefabs(
      scene,
      this.prefabs,
    );
    for (const warning of warnings) {
      console.warn(`[prefab] ${warning.message}`);
    }
    this.scene = resolved;
    this.sceneIndex.rebuild(resolved);
    const nodes = flattenNodes(resolved);
    for (const registration of this.rendererHost.getOrdered()) {
      registration.renderer.clear();
      for (const node of nodes) {
        if (registration.accepts && !registration.accepts(node)) {
          continue;
        }
        registration.renderer.createNode(node);
      }
    }
    return resolved;
  }

  clearSpawned(): void {
    this.spawnedNodeIds.clear();
  }

  /** Drop the live scene, index, and renderer nodes. Registrations stay. */
  unload(): void {
    this.clearSpawned();
    this.sceneIndex.clear();
    this.scene = undefined;
    for (const registration of this.rendererHost.getOrdered()) {
      registration.renderer.clear();
    }
  }

  writeTransform2D(nodeId: string, patch: ScriptTransform2DPatch): void {
    const node = patchTransform2D(
      this.scene,
      nodeId,
      patch,
      this.sceneIndex,
    );
    if (!node) {
      return;
    }
    this.forOwningRenderers(node, (renderer) => {
      renderer.syncTransform(node);
    });
  }

  writeTransform3D(nodeId: string, patch: ScriptTransform3DPatch): void {
    const node = patchTransform3D(
      this.scene,
      nodeId,
      patch,
      this.sceneIndex,
    );
    if (!node) {
      return;
    }
    this.forOwningRenderers(node, (renderer) => {
      renderer.syncTransform(node);
    });
  }

  writeModel3DPlayback(
    nodeId: string,
    patch: ScriptModel3DPlaybackPatch,
  ): void {
    const node = patchModel3DPlayback(
      this.scene,
      nodeId,
      patch,
      this.sceneIndex,
    );
    if (!node) {
      return;
    }
    this.forOwningRenderers(node, (renderer) => {
      renderer.updateNode(node);
    });
  }

  writeText(nodeId: string, text: string): void {
    const node = patchNodeText(this.scene, nodeId, text, this.sceneIndex);
    if (!node) {
      return;
    }
    this.forOwningRenderers(node, (renderer) => {
      renderer.updateNode(node);
    });
  }

  writeSpriteAssetId(nodeId: string, assetId: string): void {
    const node = patchSpriteAssetId(
      this.scene,
      nodeId,
      assetId,
      this.sceneIndex,
    );
    if (!node) {
      return;
    }
    this.forOwningRenderers(node, (renderer) => {
      renderer.updateNode(node);
    });
  }

  writeAnimatedSpritePlayback(
    nodeId: string,
    patch: ScriptAnimatedSpritePlaybackPatch,
  ): void {
    const node = patchAnimatedSpritePlayback(
      this.scene,
      nodeId,
      patch,
      this.sceneIndex,
    );
    if (!node) {
      return;
    }
    this.forOwningRenderers(node, (renderer) => {
      renderer.updateNode(node);
    });
  }

  reparentLiveNode(
    nodeId: string,
    parentId: string | undefined,
    index?: number,
  ): void {
    if (!this.scene || !canMoveNode(this.scene, nodeId, parentId)) {
      return;
    }
    const siblings =
      parentId === undefined
        ? this.scene.nodes
        : this.sceneIndex.getNode(parentId)?.children;
    if (!siblings) {
      return;
    }
    const insertIndex =
      index === undefined
        ? siblings.length
        : Math.max(0, Math.min(Math.floor(index), siblings.length));
    const moved = moveNodeInScene(this.scene, nodeId, parentId, insertIndex);
    this.sceneIndex.reparentNode(nodeId, parentId);
    this.forOwningRenderers(moved.node, (renderer) => {
      renderer.reparentNode(nodeId, parentId, moved.toIndex);
    });
  }

  spawnModel3DNode(options: ScriptSpawnModel3DOptions): string | undefined {
    if (!this.scene) {
      return undefined;
    }
    const node = spawnModel3DInScene(this.scene, options);
    if (!node) {
      return undefined;
    }
    this.spawnedNodeIds.add(node.id);
    this.sceneIndex.addNode(node);
    this.forAcceptingRenderers(node, (renderer) => {
      renderer.createNode(node);
    });
    return node.id;
  }

  cloneNamedNode(
    sourceName: string,
    index: number,
    columns?: number,
  ): string | undefined {
    if (!this.scene) {
      return undefined;
    }
    const node = cloneNamedNodeInScene(
      this.scene,
      sourceName,
      index,
      columns,
    );
    if (!node) {
      return undefined;
    }
    this.sceneIndex.addNode(node);
    for (const created of flattenSubtree(node)) {
      this.spawnedNodeIds.add(created.id);
      this.forAcceptingRenderers(created, (renderer) => {
        renderer.createNode(created);
      });
    }
    return node.id;
  }

  setNodeVisible(nodeId: string, visible: boolean): void {
    for (const registration of this.rendererHost.getOrdered()) {
      registration.renderer.setNodeVisible?.(nodeId, visible);
    }
  }

  setNodeAlpha(nodeId: string, alpha: number): void {
    for (const registration of this.rendererHost.getOrdered()) {
      registration.renderer.setNodeAlpha?.(nodeId, alpha);
    }
  }

  setNodeCursor(nodeId: string, cursor: string): void {
    for (const registration of this.rendererHost.getOrdered()) {
      registration.renderer.setNodeCursor?.(nodeId, cursor);
    }
  }

  destroySpawnedNode(nodeId: string): void {
    if (!this.scene || !this.spawnedNodeIds.has(nodeId)) {
      return;
    }
    const removed = destroyNodeInScene(this.scene, nodeId);
    this.sceneIndex.removeNode(nodeId);
    for (const node of removed) {
      this.spawnedNodeIds.delete(node.id);
      for (const registration of this.rendererHost.getOrdered()) {
        registration.renderer.destroyNode(node.id);
      }
    }
  }

  private forAcceptingRenderers(
    node: SceneNodeData,
    fn: (renderer: SceneRenderer) => void,
  ): void {
    for (const registration of this.rendererHost.getOrdered()) {
      if (registration.accepts && !registration.accepts(node)) {
        continue;
      }
      fn(registration.renderer);
    }
  }

  /**
   * Hybrid stacks register multiple renderers; only the slot that accepted
   * the node at loadScene owns a runtime object for it.
   */
  private forOwningRenderers(
    node: SceneNodeData,
    fn: (renderer: SceneRenderer) => void,
  ): void {
    for (const registration of this.rendererHost.getOrdered()) {
      if (registration.accepts && !registration.accepts(node)) {
        continue;
      }
      if (
        registration.renderer.hasNode &&
        !registration.renderer.hasNode(node.id)
      ) {
        continue;
      }
      fn(registration.renderer);
    }
  }
}
