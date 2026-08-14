import {
  registerSharedComponents,
  buildComponentCatalog,
  type ComponentRegistry,
} from "@game-editor/game-components";
import { listSolitaireBusEvents } from "../events/bus-events.js";
import {
  audioContainerComponent,
  installAudioContainerRuntime,
} from "./audio-container.js";
import {
  installKlondikeBoardRuntime,
  klondikeBoardComponent,
} from "./klondike-board.js";

/** Registers shared + solitaire script components into the catalog. */
export function registerGameComponents(registry: ComponentRegistry): void {
  registerSharedComponents(registry);
  registry.register(klondikeBoardComponent);
  registry.register(audioContainerComponent);
}

/** Bus events for Inspector dynamicEnum source `busEvents`. */
export function listBusEvents() {
  return listSolitaireBusEvents();
}

/** Serializable inspector catalog for project-server (no runtime create). */
export function getComponentCatalog() {
  return buildComponentCatalog(registerGameComponents, listBusEvents());
}

export function installSolitaireGameRuntime(registry: ComponentRegistry): void {
  installKlondikeBoardRuntime(registry);
  installAudioContainerRuntime(registry);
}

/** Standard hook discovered by the editor via import.meta.glob. */
export const installGameRuntime = installSolitaireGameRuntime;
