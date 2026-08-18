import type { ScriptComponentData } from "./types.js";

/** Runtime execution. Omitted `enabled` means true. */
export function isScriptEnabled(component: ScriptComponentData): boolean {
  return component.enabled !== false;
}

/** Persist `enabled: false`; omit the field when true (Git-friendly default). */
export function setScriptEnabledField(
  component: ScriptComponentData,
  enabled: boolean,
): void {
  if (enabled) {
    delete component.enabled;
  } else {
    component.enabled = false;
  }
}
