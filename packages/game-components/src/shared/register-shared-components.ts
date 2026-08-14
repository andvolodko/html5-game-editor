import type { ComponentRegistry } from "../registry.js";
import { audioClickComponent } from "./audio-click.js";
import { backgroundAudioComponent } from "./background-audio.js";
import { buttonComponent } from "./button.js";
import { changeSceneComponent } from "./change-scene.js";
import { loadAllSceneAssetsComponent } from "./load-all-scene-assets.js";
import { performanceMeterComponent } from "./performance-meter.js";

/** Registers built-in shared game components into the given registry. */
export function registerSharedComponents(registry: ComponentRegistry): void {
  registry.register(changeSceneComponent);
  registry.register(loadAllSceneAssetsComponent);
  registry.register(performanceMeterComponent);
  registry.register(audioClickComponent);
  registry.register(backgroundAudioComponent);
  registry.register(buttonComponent);
}
