import type { ComponentDefinition } from "../types.js";
import { changeSceneComponent } from "./change-scene.js";
import { performanceMeterComponent } from "./performance-meter.js";
import type { ComponentRegistry } from "../registry.js";

const SHARED_SCRIPT_RUNTIME: readonly ComponentDefinition[] = [
  changeSceneComponent,
  performanceMeterComponent,
];

/**
 * Re-attach `create` factories for shared scripts onto a catalog registry.
 * Needed after server catalogs strip non-serializable `create` functions.
 */
export function installSceneFlowRuntime(registry: ComponentRegistry): void {
  for (const runtimeDef of SHARED_SCRIPT_RUNTIME) {
    const existing = registry.get(runtimeDef.id);
    if (!existing || !runtimeDef.create) {
      continue;
    }
    existing.create = runtimeDef.create;
  }
}
