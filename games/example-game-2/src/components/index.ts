import {
  defineComponent,
  registerSharedComponents,
  buildComponentCatalog,
  type ComponentRegistry,
} from "@game-editor/game-components";

/** Game-local demo for the second example project. */
export const bounceMotionComponent = defineComponent({
  id: "example2.BounceMotion",
  displayName: "Bounce Motion",
  category: "Gameplay",
  categoryOrder: 10,
  order: 20,
  allowMultiple: false,
  properties: {
    amplitude: { kind: "number", default: 16, min: 0, step: 1 },
    frequency: { kind: "number", default: 1, min: 0, step: 0.1 },
    axis: {
      kind: "enum",
      default: "y",
      options: ["x", "y"],
    },
  },
});

/** Registers shared + example-game-2 script components into the catalog. */
export function registerGameComponents(registry: ComponentRegistry): void {
  registerSharedComponents(registry);
  registry.register(bounceMotionComponent);
}

/** Serializable inspector catalog for project-server. */
export function getComponentCatalog() {
  return buildComponentCatalog(registerGameComponents, []);
}
