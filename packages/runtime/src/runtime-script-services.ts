import type { EventBus } from "@game-editor/core";
import type {
  NodePointerEventName,
  ScriptAnimatedSpritePlayback,
  ScriptAnimatedSpritePlaybackPatch,
  ScriptChildNodeRef,
  ScriptModel3DPlayback,
  ScriptModel3DPlaybackPatch,
  ScriptPerformanceStats,
  ScriptRuntimeServices,
  ScriptSpawnModel3DOptions,
  ScriptTransform2D,
  ScriptTransform2DPatch,
  ScriptTransform3D,
  ScriptTransform3DPatch,
} from "@game-editor/game-components";
import type { SceneIndex } from "@game-editor/scene";
import {
  getHitZone,
  isHitZoneEnabled,
  type SceneData,
} from "@game-editor/scene";
import {
  readAnimatedSpritePlayback,
  readModel3DPlayback,
  readTransform2D,
  readTransform3D,
} from "./script-scene-io.js";

export interface RuntimeScriptServiceHost {
  readonly bus: EventBus;
  readonly sceneIndex: SceneIndex;
  getChangeSceneHandler():
    | ((sceneId: string) => void | Promise<void>)
    | undefined;
  getScene(): SceneData | undefined;
  subscribeNodeClick(nodeId: string, handler: () => void): () => void;
  subscribeNodePointerEvent(
    nodeId: string,
    event: NodePointerEventName,
    handler: () => void,
  ): () => void;
  writeTransform2D(nodeId: string, patch: ScriptTransform2DPatch): void;
  writeTransform3D(nodeId: string, patch: ScriptTransform3DPatch): void;
  writeModel3DPlayback(nodeId: string, patch: ScriptModel3DPlaybackPatch): void;
  writeText(nodeId: string, text: string): void;
  writeSpriteAssetId(nodeId: string, assetId: string): void;
  writeAnimatedSpritePlayback(
    nodeId: string,
    patch: ScriptAnimatedSpritePlaybackPatch,
  ): void;
  reparentLiveNode(
    nodeId: string,
    parentId: string | undefined,
    index?: number,
  ): void;
  getPerformanceStats(): ScriptPerformanceStats;
  readBoneWorldTransform(
    nodeId: string,
    boneName: string,
  ): ScriptTransform3D | undefined;
  spawnModel3DNode(options: ScriptSpawnModel3DOptions): string | undefined;
  cloneNamedNode(
    sourceName: string,
    index: number,
    columns?: number,
  ): string | undefined;
  destroySpawnedNode(nodeId: string): void;
  setNodeVisible(nodeId: string, visible: boolean): void;
  setNodeAlpha(nodeId: string, alpha: number): void;
  setNodeState(nodeId: string, stateIdOrName: string | null): void;
  getNodeState(nodeId: string): string | null;
  setNodeCursor(nodeId: string, cursor: string): void;
}

/**
 * Default ScriptRuntimeServices bound to a GameRuntime host.
 * External option overrides stay first so preview/tests can intercept.
 */
export function createRuntimeScriptServices(
  host: RuntimeScriptServiceHost,
  external: Partial<ScriptRuntimeServices>,
): ScriptRuntimeServices {
  return {
    bus: host.bus,
    changeScene: (sceneId) => {
      const handler = host.getChangeSceneHandler();
      if (!handler) {
        return;
      }
      return handler(sceneId);
    },
    onNodeClick: (nodeId, handler) => {
      if (external.onNodeClick) {
        return external.onNodeClick(nodeId, handler);
      }
      return host.subscribeNodeClick(nodeId, handler);
    },
    onNodePointerEvent: (nodeId, event, handler) => {
      if (external.onNodePointerEvent) {
        return external.onNodePointerEvent(nodeId, event, handler);
      }
      return host.subscribeNodePointerEvent(nodeId, event, handler);
    },
    resolveAssetUrl: external.resolveAssetUrl,
    listAllSceneAssetIds: external.listAllSceneAssetIds,
    preloadSceneAsset: external.preloadSceneAsset,
    playAudio: external.playAudio,
    stopAudio: external.stopAudio,
    setAudioEnabled: external.setAudioEnabled,
    setAudioVolume: external.setAudioVolume,
    getTransform2D: (nodeId): ScriptTransform2D | undefined => {
      if (external.getTransform2D) {
        return external.getTransform2D(nodeId);
      }
      return readTransform2D(host.getScene(), nodeId, host.sceneIndex);
    },
    setTransform2D: (nodeId, patch) => {
      if (external.setTransform2D) {
        external.setTransform2D(nodeId, patch);
        return;
      }
      host.writeTransform2D(nodeId, patch);
    },
    getTransform3D: (nodeId): ScriptTransform3D | undefined => {
      if (external.getTransform3D) {
        return external.getTransform3D(nodeId);
      }
      return readTransform3D(host.getScene(), nodeId, host.sceneIndex);
    },
    setTransform3D: (nodeId, patch) => {
      if (external.setTransform3D) {
        external.setTransform3D(nodeId, patch);
        return;
      }
      host.writeTransform3D(nodeId, patch);
    },
    getModel3DPlayback: (nodeId): ScriptModel3DPlayback | undefined => {
      if (external.getModel3DPlayback) {
        return external.getModel3DPlayback(nodeId);
      }
      return readModel3DPlayback(host.getScene(), nodeId, host.sceneIndex);
    },
    setModel3DPlayback: (nodeId, patch) => {
      if (external.setModel3DPlayback) {
        external.setModel3DPlayback(nodeId, patch);
        return;
      }
      host.writeModel3DPlayback(nodeId, patch);
    },
    listModel3DAnimations: (nodeId) => {
      return external.listModel3DAnimations?.(nodeId) ?? [];
    },
    getModel3DAnimationDuration: (nodeId, animation) => {
      return external.getModel3DAnimationDuration?.(nodeId, animation);
    },
    getModel3DBoneWorldTransform: (nodeId, boneName) => {
      if (external.getModel3DBoneWorldTransform) {
        return external.getModel3DBoneWorldTransform(nodeId, boneName);
      }
      return host.readBoneWorldTransform(nodeId, boneName);
    },
    setText: (nodeId, text) => {
      if (external.setText) {
        external.setText(nodeId, text);
        return;
      }
      host.writeText(nodeId, text);
    },
    setSpriteAssetId: (nodeId, assetId) => {
      if (external.setSpriteAssetId) {
        external.setSpriteAssetId(nodeId, assetId);
        return;
      }
      host.writeSpriteAssetId(nodeId, assetId);
    },
    getAnimatedSpritePlayback: (
      nodeId,
    ): ScriptAnimatedSpritePlayback | undefined => {
      if (external.getAnimatedSpritePlayback) {
        return external.getAnimatedSpritePlayback(nodeId);
      }
      return readAnimatedSpritePlayback(
        host.getScene(),
        nodeId,
        host.sceneIndex,
      );
    },
    setAnimatedSpritePlayback: (nodeId, patch) => {
      if (external.setAnimatedSpritePlayback) {
        external.setAnimatedSpritePlayback(nodeId, patch);
        return;
      }
      host.writeAnimatedSpritePlayback(nodeId, patch);
    },
    reparentNode: (nodeId, parentId, index) => {
      if (external.reparentNode) {
        external.reparentNode(nodeId, parentId, index);
        return;
      }
      host.reparentLiveNode(nodeId, parentId, index);
    },
    getPerformanceStats: () => {
      if (external.getPerformanceStats) {
        return external.getPerformanceStats();
      }
      return host.getPerformanceStats();
    },
    spawnModel3D: (spawnOptions) => {
      if (external.spawnModel3D) {
        return external.spawnModel3D(spawnOptions);
      }
      return host.spawnModel3DNode(spawnOptions);
    },
    cloneNodeByName: (sourceName, index, columns) => {
      if (external.cloneNodeByName) {
        return external.cloneNodeByName(sourceName, index, columns);
      }
      return host.cloneNamedNode(sourceName, index, columns);
    },
    destroyNode: (nodeId) => {
      if (external.destroyNode) {
        external.destroyNode(nodeId);
        return;
      }
      host.destroySpawnedNode(nodeId);
    },
    listChildNodes: (nodeId): readonly ScriptChildNodeRef[] => {
      if (external.listChildNodes) {
        return external.listChildNodes(nodeId);
      }
      const node = host.sceneIndex.getNode(nodeId);
      if (!node) {
        return [];
      }
      return node.children.map((child) => ({ id: child.id, name: child.name }));
    },
    hasHitZone: (nodeId) => {
      if (external.hasHitZone) {
        return external.hasHitZone(nodeId);
      }
      const node = host.sceneIndex.getNode(nodeId);
      if (!node) {
        return false;
      }
      const hitZone = getHitZone(node);
      return hitZone !== undefined && isHitZoneEnabled(hitZone);
    },
    setNodeVisible: (nodeId, visible) => {
      if (external.setNodeVisible) {
        external.setNodeVisible(nodeId, visible);
        return;
      }
      host.setNodeVisible(nodeId, visible);
    },
    setNodeAlpha: (nodeId, alpha) => {
      if (external.setNodeAlpha) {
        external.setNodeAlpha(nodeId, alpha);
        return;
      }
      host.setNodeAlpha(nodeId, alpha);
    },
    setNodeState: (nodeId, stateIdOrName) => {
      if (external.setNodeState) {
        external.setNodeState(nodeId, stateIdOrName);
        return;
      }
      host.setNodeState(nodeId, stateIdOrName);
    },
    getNodeState: (nodeId) => {
      if (external.getNodeState) {
        return external.getNodeState(nodeId);
      }
      return host.getNodeState(nodeId);
    },
    setNodeCursor: (nodeId, cursor) => {
      if (external.setNodeCursor) {
        external.setNodeCursor(nodeId, cursor);
        return;
      }
      host.setNodeCursor(nodeId, cursor);
    },
  };
}
