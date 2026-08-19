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

export class ChangeSceneBehaviour implements ScriptInstance {
  private eventId = "game.start";
  private sceneName = "main";
  private unsubscribe: (() => void) | undefined;

  constructor(private readonly ctx: ScriptCreateContext) {
    this.applyProperties(ctx.properties);
  }

  start(): void {
    this.subscribe();
  }

  onPropertiesChanged(
    properties: Readonly<Record<string, unknown>>,
  ): void {
    this.applyProperties(properties);
    this.subscribe();
  }

  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  private applyProperties(raw: Readonly<Record<string, unknown>>): void {
    this.eventId =
      typeof raw.event === "string" ? raw.event : "game.start";
    this.sceneName =
      typeof raw.sceneName === "string" ? raw.sceneName : "main";
  }

  private subscribe(): void {
    this.unsubscribe?.();
    this.unsubscribe = this.ctx.services.bus.on(this.eventId, () => {
      void this.ctx.services.changeScene(this.sceneName);
    });
  }
}

function createChangeSceneInstance(context: ScriptCreateContext): ScriptInstance {
  return new ChangeSceneBehaviour(context);
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
