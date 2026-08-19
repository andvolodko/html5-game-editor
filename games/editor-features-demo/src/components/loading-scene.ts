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

type Props = {
  completeEvent: string;
  nextScene: string;
  minDisplayMs: number;
};

function readProps(raw: Readonly<Record<string, unknown>>): Props {
  return {
    completeEvent:
      typeof raw.completeEvent === "string" && raw.completeEvent.length > 0
        ? raw.completeEvent
        : DEFAULT_COMPLETE_EVENT,
    nextScene:
      typeof raw.nextScene === "string" && raw.nextScene.length > 0
        ? raw.nextScene
        : DEFAULT_NEXT_SCENE,
    minDisplayMs:
      typeof raw.minDisplayMs === "number" && Number.isFinite(raw.minDisplayMs)
        ? Math.max(0, raw.minDisplayMs)
        : DEFAULT_MIN_DISPLAY_MS,
  };
}

/**
 * Loading Scene controller.
 * Waits until `completeEvent` (from Load All Scene Assets) has fired **and**
 * `minDisplayMs` has elapsed, then navigates to `nextScene`.
 */
export class LoadingSceneBehaviour implements ScriptInstance {
  private completeEvent = DEFAULT_COMPLETE_EVENT;
  private nextScene = DEFAULT_NEXT_SCENE;
  private minDisplayMs = DEFAULT_MIN_DISPLAY_MS;
  private loadComplete = false;
  private minTimeElapsed = false;
  private navigated = false;
  private timeoutId: ReturnType<typeof setTimeout> | undefined;
  private unsubscribe: (() => void) | undefined;

  constructor(private readonly ctx: ScriptCreateContext) {
    this.applyProperties(ctx.properties);
  }

  start(): void {
    this.subscribe();
    this.timeoutId = setTimeout(() => {
      this.minTimeElapsed = true;
      this.tryNavigate();
    }, this.minDisplayMs);
  }

  onPropertiesChanged(
    properties: Readonly<Record<string, unknown>>,
  ): void {
    const previousEvent = this.completeEvent;
    this.applyProperties(properties);
    if (previousEvent !== this.completeEvent) {
      this.subscribe();
    }
  }

  destroy(): void {
    this.navigated = true;
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    if (this.timeoutId !== undefined) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  private applyProperties(raw: Readonly<Record<string, unknown>>): void {
    const props = readProps(raw);
    this.completeEvent = props.completeEvent;
    this.nextScene = props.nextScene;
    this.minDisplayMs = props.minDisplayMs;
  }

  private subscribe(): void {
    this.unsubscribe?.();
    this.unsubscribe = this.ctx.events.on(this.completeEvent, () => {
      this.loadComplete = true;
      this.tryNavigate();
    });
  }

  private tryNavigate(): void {
    if (this.navigated || !this.loadComplete || !this.minTimeElapsed) {
      return;
    }
    this.navigated = true;
    void this.ctx.services.changeScene(this.nextScene);
  }
}

const LOADING_SCENE_PROPERTIES: ComponentDefinition["properties"] = {
  completeEvent: {
    kind: "dynamicEnum",
    default: DEFAULT_COMPLETE_EVENT,
    source: "busEvents",
    description:
      "Wait for this bus event (Load All Scene Assets) and minDisplayMs, then change scene.",
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
    description: "Minimum splash time even if preload finishes earlier.",
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
