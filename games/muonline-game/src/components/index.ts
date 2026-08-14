import {
  registerSharedComponents,
  buildComponentCatalog,
  type ComponentRegistry,
} from "@game-editor/game-components";
import { listMuonlineBusEvents } from "../events/bus-events.js";
import {
  catapultIdleComponent,
  installCatapultIdleRuntime,
} from "./catapult-idle.js";
import {
  catapultThrowComponent,
  installCatapultThrowRuntime,
} from "./catapult-throw.js";
import {
  battlefieldCameraComponent,
  installBattlefieldCameraRuntime,
} from "./battlefield-camera.js";
import {
  installMonsterAiRuntime,
  monsterAiComponent,
} from "./monster-ai.js";
import {
  installSantaWanderRuntime,
  santaWanderComponent,
} from "./santa-wander.js";
import {
  audioContainerComponent,
  installAudioContainerRuntime,
} from "./audio-container.js";

/** Registers shared + muonline-game script components into the catalog. */
export function registerGameComponents(registry: ComponentRegistry): void {
  registerSharedComponents(registry);
  registry.register(monsterAiComponent);
  registry.register(santaWanderComponent);
  registry.register(catapultIdleComponent);
  registry.register(catapultThrowComponent);
  registry.register(battlefieldCameraComponent);
  registry.register(audioContainerComponent);
}

/** Bus events for Inspector dynamicEnum source `busEvents`. */
export function listBusEvents() {
  return listMuonlineBusEvents();
}

/** Serializable inspector catalog for project-server (no runtime create). */
export function getComponentCatalog() {
  return buildComponentCatalog(registerGameComponents, listBusEvents());
}

export function installMuonlineGameRuntime(registry: ComponentRegistry): void {
  installMonsterAiRuntime(registry);
  installSantaWanderRuntime(registry);
  installCatapultIdleRuntime(registry);
  installCatapultThrowRuntime(registry);
  installBattlefieldCameraRuntime(registry);
  installAudioContainerRuntime(registry);
}

/** Standard hook discovered by the editor via import.meta.glob. */
export const installGameRuntime = installMuonlineGameRuntime;
