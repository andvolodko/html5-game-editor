import type { ComponentRegistry } from "../registry.js";
import { audioClickComponent } from "./audio-click.js";
import { changeSceneComponent } from "./change-scene.js";
import { performanceMeterComponent } from "./performance-meter.js";

/** Registers built-in shared game components into the given registry. */
export function registerSharedComponents(registry: ComponentRegistry): void {
  registry.register(changeSceneComponent);
  registry.register(performanceMeterComponent);
  registry.register(audioClickComponent);
}
