import {
  createDetachedRuntimeTransform2D,
  type RuntimeTransform2D,
} from "@game-editor/scene";
import { createScriptAnimationsApi } from "./script-animations-api.js";
import { createScriptTransformApi } from "./script-transform-api.js";
import type {
  ScriptCreateContext,
  ScriptRuntimeServices,
} from "./types.js";

export interface CreateScriptContextInput {
  nodeId: string;
  componentId: string;
  scriptId: string;
  properties: Readonly<Record<string, unknown>>;
  services: ScriptRuntimeServices;
  transform?: RuntimeTransform2D;
}

/**
 * Canonical ScriptCreateContext factory.
 * Builds `transform3D` and `animations` wrappers bound to `nodeId`.
 */
export function createScriptContext(
  input: CreateScriptContextInput,
): ScriptCreateContext {
  return {
    nodeId: input.nodeId,
    componentId: input.componentId,
    scriptId: input.scriptId,
    properties: input.properties,
    services: input.services,
    transform: input.transform ?? createDetachedRuntimeTransform2D(),
    transform3D: createScriptTransformApi(input.nodeId, input.services),
    animations: createScriptAnimationsApi(input.nodeId, input.services),
  };
}
