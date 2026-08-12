import { defineComponent } from "../define-component.js";
import type { ComponentRegistry } from "../registry.js";
import { changeSceneComponent } from "./change-scene.js";

/** Shared sample: simple health / hit points for any node. */
export const healthComponent = defineComponent({
  id: "shared.Health",
  displayName: "Health",
  category: "Gameplay",
  categoryOrder: 10,
  order: 10,
  allowMultiple: false,
  properties: {
    maxHp: { kind: "number", default: 100, min: 1, step: 1 },
    currentHp: { kind: "number", default: 100, min: 0, step: 1 },
    invulnerable: { kind: "boolean", default: false },
  },
});

/** Registers built-in shared game components into the given registry. */
export function registerSharedComponents(registry: ComponentRegistry): void {
  registry.register(healthComponent);
  registry.register(changeSceneComponent);
}
