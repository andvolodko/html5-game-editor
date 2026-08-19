import {
  registerSharedComponents,
  buildComponentCatalog,
  type ComponentRegistry,
} from "@game-editor/game-components";
import { listGameBusEvents } from "../events/bus-events.js";
import {
  installLoadingSceneRuntime,
  loadingSceneComponent,
} from "./loading-scene.js";
import {
  installGoSpineButtonRuntime,
  goSpineButtonComponent,
} from "./go-spine-button.js";
import {
  installRaptorRuntime,
  raptorComponent,
} from "./raptor.js";
import {
  cloneObjectComponent,
  installCloneObjectRuntime,
} from "./clone-object.js";
import { cloudComponent, installCloudRuntime } from "./cloud.js";
import {
  installUnitLogicRuntime,
  unitLogicComponent,
} from "./unit-logic.js";

/** Registers shared + editor-features-demo script components into the catalog. */
export function registerGameComponents(registry: ComponentRegistry): void {
  registerSharedComponents(registry);
  registry.register(loadingSceneComponent);
  registry.register(goSpineButtonComponent);
  registry.register(raptorComponent);
  registry.register(cloneObjectComponent);
  registry.register(cloudComponent);
  registry.register(unitLogicComponent);
}

/** Bus events for Inspector dynamicEnum source `busEvents`. */
export function listBusEvents() {
  return listGameBusEvents();
}

/** Serializable inspector catalog for project-server (no runtime create). */
export function getComponentCatalog() {
  return buildComponentCatalog(registerGameComponents, listBusEvents());
}

/**
 * Re-attach editor-features-demo `create` factories after a metadata catalog load.
 * Prefer the standard alias `installGameRuntime` for editor/preview discovery.
 */
export function installEditorFeaturesDemoRuntime(registry: ComponentRegistry): void {
  installLoadingSceneRuntime(registry);
  installGoSpineButtonRuntime(registry);
  installRaptorRuntime(registry);
  installCloneObjectRuntime(registry);
  installCloudRuntime(registry);
  installUnitLogicRuntime(registry);
}

/** Standard hook discovered by the editor via import.meta.glob. */
export const installGameRuntime = installEditorFeaturesDemoRuntime;

export {
  loadingSceneComponent,
  installLoadingSceneRuntime,
} from "./loading-scene.js";
export {
  raptorComponent,
  installRaptorRuntime,
  RaptorBehaviour,
} from "./raptor.js";
export {
  cloneObjectComponent,
  installCloneObjectRuntime,
  CloneObjectBehaviour,
} from "./clone-object.js";
export {
  cloudComponent,
  installCloudRuntime,
  CloudBehaviour,
} from "./cloud.js";
export {
  unitLogicComponent,
  installUnitLogicRuntime,
  UnitLogicBehaviour,
} from "./unit-logic.js";
