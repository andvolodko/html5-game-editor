import {
  registerSharedComponents,
  buildComponentCatalog,
  type ComponentRegistry,
} from "@game-editor/game-components";
import { listExampleBusEvents } from "../events/bus-events.js";
import {
  installExampleLoadingSceneRuntime,
  loadingSceneComponent,
} from "./loading-scene.js";
import {
  installMainButtonRuntime,
  mainButtonComponent,
} from "./main-button.js";
import {
  installGoSpineButtonRuntime,
  goSpineButtonComponent,
} from "./go-spine-button.js";
import {
  installRaptorRuntime,
  raptorComponent,
} from "./raptor.js";

/** Registers shared + example-game script components into the catalog. */
export function registerGameComponents(registry: ComponentRegistry): void {
  registerSharedComponents(registry);
  registry.register(loadingSceneComponent);
  registry.register(mainButtonComponent);
  registry.register(goSpineButtonComponent);
  registry.register(raptorComponent);
}

/** Bus events for Inspector dynamicEnum source `busEvents`. */
export function listBusEvents() {
  return listExampleBusEvents();
}

/** Serializable inspector catalog for project-server (no runtime create). */
export function getComponentCatalog() {
  return buildComponentCatalog(registerGameComponents, listBusEvents());
}

/**
 * Re-attach example-game `create` factories after a metadata catalog load.
 * Prefer the standard alias `installGameRuntime` for editor/preview discovery.
 */
export function installExampleGameRuntime(registry: ComponentRegistry): void {
  installExampleLoadingSceneRuntime(registry);
  installMainButtonRuntime(registry);
  installGoSpineButtonRuntime(registry);
  installRaptorRuntime(registry);
}

/** Standard hook discovered by the editor via import.meta.glob. */
export const installGameRuntime = installExampleGameRuntime;

export {
  loadingSceneComponent,
  installExampleLoadingSceneRuntime,
} from "./loading-scene.js";
export {
  mainButtonComponent,
  installMainButtonRuntime,
  MainButtonBehaviour,
} from "./main-button.js";
export {
  raptorComponent,
  installRaptorRuntime,
  RaptorBehaviour,
} from "./raptor.js";
