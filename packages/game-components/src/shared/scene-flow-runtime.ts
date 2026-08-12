import type { ComponentDefinition } from "../types.js";
import { changeSceneComponent } from "./change-scene.js";
import type { ComponentRegistry } from "../registry.js";

const SCENE_FLOW_RUNTIME: readonly ComponentDefinition[] = [
  changeSceneComponent,
];

/**
 * Re-attach `create` factories for shared scene-flow scripts onto a catalog registry.
 * Needed after server catalogs strip non-serializable `create` functions.
 */
export function installSceneFlowRuntime(registry: ComponentRegistry): void {
  for (const runtimeDef of SCENE_FLOW_RUNTIME) {
    const existing = registry.get(runtimeDef.id);
    if (!existing || !runtimeDef.create) {
      continue;
    }
    existing.create = runtimeDef.create;
  }
}
