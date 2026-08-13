import {
  defineComponent,
  type ComponentDefinition,
  type ComponentRegistry,
  type ScriptCreateContext,
  type ScriptInstance,
} from "@game-editor/game-components";

/**
 * Loading Scene controller.
 * After `minDisplayMs`, dispatches `completeEvent` (default `loading.complete`)
 * on the bus, then navigates to `nextScene`.
 */
function createLoadingSceneInstance(context: ScriptCreateContext): ScriptInstance {
  const completeEvent =
    typeof context.properties.completeEvent === "string"
      ? context.properties.completeEvent
      : "loading.complete";
  const nextScene =
    typeof context.properties.nextScene === "string"
      ? context.properties.nextScene
      : "main";
  const minDisplayMs =
    typeof context.properties.minDisplayMs === "number"
      ? context.properties.minDisplayMs
      : 500;

  let finished = false;
  const timeoutId = setTimeout(() => {
    if (finished) {
      return;
    }
    finished = true;
    context.services.bus.emit(completeEvent);
    void context.services.changeScene(nextScene);
  }, Math.max(0, minDisplayMs));

  return {
    destroy() {
      finished = true;
      clearTimeout(timeoutId);
    },
  };
}

const LOADING_SCENE_PROPERTIES: ComponentDefinition["properties"] = {
  completeEvent: {
    kind: "dynamicEnum",
    default: "loading.complete",
    source: "busEvents",
  },
  nextScene: {
    kind: "dynamicEnum",
    default: "main",
    source: "scenes",
  },
  minDisplayMs: {
    kind: "number",
    default: 500,
    min: 0,
    step: 50,
  },
};

export const loadingSceneComponent = defineComponent({
  id: "editor-features-demo.LoadingScene",
  displayName: "Loading Scene",
  category: "Scene",
  categoryOrder: 5,
  order: 20,
  allowMultiple: false,
  properties: LOADING_SCENE_PROPERTIES,
  create: createLoadingSceneInstance,
});

/** Re-attach create after a metadata-only catalog load (editor / preview). */
export function installLoadingSceneRuntime(
  registry: ComponentRegistry,
): void {
  const existing = registry.get(loadingSceneComponent.id);
  if (existing && loadingSceneComponent.create) {
    existing.create = loadingSceneComponent.create;
  }
}
