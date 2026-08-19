import {
  createDetachedRuntimeTransform2D,
  type RuntimeTransform2D,
  type RuntimeTransform3D,
} from "@game-editor/scene";
import { createScriptAnimationsApi } from "./script-animations-api.js";
import { createScriptAudioApi } from "./script-audio-api.js";
import { createScriptNodeHandleCache } from "./script-node-api.js";
import { createScriptSceneApi } from "./script-scene-api.js";
import { createScriptTransformApi } from "./script-transform-api.js";
import type {
  ScriptCreateContext,
  ScriptRuntimeServices,
  ScriptSceneLookup,
} from "./types.js";

export interface CreateScriptContextInput {
  nodeId: string;
  componentId: string;
  scriptId: string;
  properties: Readonly<Record<string, unknown>>;
  services: ScriptRuntimeServices;
  transform?: RuntimeTransform2D;
  transform3D?: RuntimeTransform3D;
  lookup?: ScriptSceneLookup;
}

/**
 * Canonical ScriptCreateContext factory.
 * Builds persistent `transform3D`, `animations`, `node`, `audio`, and `scene`
 * wrappers bound to `nodeId`.
 */
export function createScriptContext(
  input: CreateScriptContextInput,
): ScriptCreateContext {
  const cache = createScriptNodeHandleCache(input.services, input.lookup);
  return {
    nodeId: input.nodeId,
    componentId: input.componentId,
    scriptId: input.scriptId,
    properties: input.properties,
    services: input.services,
    events: input.services.bus,
    transform: input.transform ?? createDetachedRuntimeTransform2D(),
    transform3D:
      input.transform3D ??
      createScriptTransformApi(input.nodeId, input.services),
    animations: createScriptAnimationsApi(input.nodeId, input.services),
    node: cache.get(input.nodeId),
    audio: createScriptAudioApi(input.services),
    scene: createScriptSceneApi(
      input.services,
      cache,
      (name) => input.lookup?.findByName(name)?.id,
    ),
  };
}
