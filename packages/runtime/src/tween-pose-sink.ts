import type { ScriptTransform2DPatch } from "@game-editor/game-components";
import {
  getNodeAlpha,
  IDENTITY_NODE_ALPHA,
  NODE_ALPHA_MAX,
  NODE_ALPHA_MIN,
  type SceneData,
  type SceneIndex,
} from "@game-editor/scene";
import type { TweenPose, TweenPoseSink } from "./tween-runner.js";
import { readTransform2D } from "./script-scene-io.js";

export interface TweenPoseHost {
  getScene(): SceneData | undefined;
  readonly sceneIndex: SceneIndex;
  writeTransform2D(nodeId: string, patch: ScriptTransform2DPatch): void;
  setNodeAlpha(nodeId: string, alpha: number): void;
}

function clampAlpha(alpha: number): number {
  return Math.min(NODE_ALPHA_MAX, Math.max(NODE_ALPHA_MIN, alpha));
}

export function createTweenPoseSink(host: TweenPoseHost): TweenPoseSink {
  return {
    readPose(nodeId: string): TweenPose | undefined {
      const transform = readTransform2D(
        host.getScene(),
        nodeId,
        host.sceneIndex,
      );
      const node = host.sceneIndex.getNode(nodeId);
      if (!transform && !node) {
        return undefined;
      }
      return {
        x: transform?.position.x ?? 0,
        y: transform?.position.y ?? 0,
        rotation: transform?.rotation ?? 0,
        scaleX: transform?.scale.x ?? 1,
        scaleY: transform?.scale.y ?? 1,
        alpha: node ? getNodeAlpha(node) : IDENTITY_NODE_ALPHA,
      };
    },
    writeTransform(nodeId, pose, channels) {
      const current = readTransform2D(
        host.getScene(),
        nodeId,
        host.sceneIndex,
      );
      if (!current) {
        return;
      }
      const patch: ScriptTransform2DPatch = {};
      if (channels.has("x") || channels.has("y")) {
        patch.position = {
          x: channels.has("x") ? pose.x : current.position.x,
          y: channels.has("y") ? pose.y : current.position.y,
        };
      }
      if (channels.has("rotation")) {
        patch.rotation = pose.rotation;
      }
      if (channels.has("scaleX") || channels.has("scaleY")) {
        patch.scale = {
          x: channels.has("scaleX") ? pose.scaleX : current.scale.x,
          y: channels.has("scaleY") ? pose.scaleY : current.scale.y,
        };
      }
      host.writeTransform2D(nodeId, patch);
    },
    writeAlpha(nodeId, alpha) {
      host.setNodeAlpha(nodeId, clampAlpha(alpha));
    },
  };
}
