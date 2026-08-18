import { createId } from "@game-editor/shared";
import type { ScriptComponentData } from "../types.js";

export function createScriptComponent(
  scriptId: string,
  properties: Record<string, unknown> = {},
  partial?: { id?: string; enabled?: boolean },
): ScriptComponentData {
  const data: ScriptComponentData = {
    type: "Script",
    id: partial?.id ?? createId("comp"),
    scriptId,
    properties: structuredClone(properties),
  };
  if (partial?.enabled === false) {
    data.enabled = false;
  }
  return data;
}
