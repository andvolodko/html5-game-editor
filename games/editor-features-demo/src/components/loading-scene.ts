import {
  defineComponent,
  type ComponentDefinition,
  type ComponentRegistry,
  type ScriptCreateContext,
  type ScriptInstance,
} from "@game-editor/game-components";

const DEFAULT_COMPLETE_EVENT = "loading.complete";
const DEFAULT_NEXT_SCENE = "main";
const DEFAULT_MIN_DISPLAY_MS = 500;

/**
 * Loading Scene controller.
 * After `minDisplayMs`, dispatches `completeEvent` (default `loading.complete`)
 * on the bus, then navigates to `nextScene`.
 */
export class LoadingSceneBehaviour implements ScriptInstance {
  private completeEvent = DEFAULT_COMPLETE_EVENT;
  private nextScene = DEFAULT_NEXT_SCENE;
  private minDisplayMs = DEFAULT_MIN_DISPLAY_MS;
  private finished = false;
  private timeoutId: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly ctx: ScriptCreateContext) {
    this.applyProperties(ctx.properties);
  }

  start(): void {
    this.timeoutId = setTimeout(() => {
      if (this.finished) {
        return;
      }
      this.finished = true;
      this.ctx.services.bus.emit(this.completeEvent);
      void this.ctx.services.changeScene(this.nextScene);
    }, Math.max(0, this.minDisplayMs));
  }

  onPropertiesChanged(
    properties: Readonly<Record<string, unknown>>,
  ): void {
    this.applyProperties(properties);
  }

  destroy(): void {
    this.finished = true;
    if (this.timeoutId !== undefined) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  private applyProperties(raw: Readonly<Record<string, unknown>>): void {
    this.completeEvent =
      typeof raw.completeEvent === "string"
        ? raw.completeEvent
        : DEFAULT_COMPLETE_EVENT;
    this.nextScene =
      typeof raw.nextScene === "string" ? raw.nextScene : DEFAULT_NEXT_SCENE;
    this.minDisplayMs =
      typeof raw.minDisplayMs === "number"
        ? raw.minDisplayMs
        : DEFAULT_MIN_DISPLAY_MS;
  }
}

const LOADING_SCENE_PROPERTIES: ComponentDefinition["properties"] = {
  completeEvent: {
    kind: "dynamicEnum",
    default: DEFAULT_COMPLETE_EVENT,
    source: "busEvents",
  },
  nextScene: {
    kind: "dynamicEnum",
    default: DEFAULT_NEXT_SCENE,
    source: "scenes",
  },
  minDisplayMs: {
    kind: "number",
    default: DEFAULT_MIN_DISPLAY_MS,
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
  create: (ctx) => new LoadingSceneBehaviour(ctx),
});

/** Re-attach create after a metadata-only catalog load (editor / preview). */
export function installLoadingSceneRuntime(
  registry: ComponentRegistry,
): void {
  registry.attachRuntime(loadingSceneComponent.id, loadingSceneComponent.create);
}
