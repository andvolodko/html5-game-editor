import { defineComponent } from "../define-component.js";
import type {
  ComponentDefinition,
  ScriptCreateContext,
  ScriptInstance,
} from "../types.js";

const CHANGE_SCENE_PROPERTIES: ComponentDefinition["properties"] = {
  event: {
    kind: "dynamicEnum",
    default: "game.start",
    source: "busEvents",
  },
  sceneName: {
    kind: "dynamicEnum",
    default: "main",
    source: "scenes",
  },
};

function createChangeSceneInstance(context: ScriptCreateContext): ScriptInstance {
  const eventId =
    typeof context.properties.event === "string"
      ? context.properties.event
      : "game.start";
  const sceneName =
    typeof context.properties.sceneName === "string"
      ? context.properties.sceneName
      : "main";

  const unsubscribe = context.services.bus.on(eventId, () => {
    void context.services.changeScene(sceneName);
  });

  return {
    destroy() {
      unsubscribe();
    },
  };
}

/**
 * On bus `event`, navigate to `sceneName`.
 * Uses `ScriptCreateContext.services` (GameRuntime / preview).
 */
export const changeSceneComponent = defineComponent({
  id: "shared.ChangeScene",
  displayName: "Change Scene",
  category: "Scene",
  categoryOrder: 5,
  order: 10,
  allowMultiple: true,
  properties: CHANGE_SCENE_PROPERTIES,
  create: createChangeSceneInstance,
});
