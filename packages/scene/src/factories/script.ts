import { createId } from "@game-editor/shared";
import type { ScriptComponentData } from "../types.js";

export function createScriptComponent(
  scriptId: string,
  properties: Record<string, unknown> = {},
  partial?: { id?: string },
): ScriptComponentData {
  return {
    type: "Script",
    id: partial?.id ?? createId("comp"),
    scriptId,
    properties: structuredClone(properties),
  };
}
