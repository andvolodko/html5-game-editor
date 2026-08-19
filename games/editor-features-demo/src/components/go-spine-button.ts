import {
  defineComponent,
  type ComponentDefinition,
  type ComponentRegistry,
  type ScriptCreateContext,
  type ScriptInstance,
} from "@game-editor/game-components";

const DEFAULT_SCENE_ID = "spine";

type Props = {
  sceneName: string;
};

function readProps(raw: Readonly<Record<string, unknown>>): Props {
  return {
    sceneName:
      typeof raw.sceneName === "string" && raw.sceneName.length > 0
        ? raw.sceneName
        : DEFAULT_SCENE_ID,
  };
}

/** Live instance — on click, navigates to the selected scene. */
export class GoSpineButtonBehaviour implements ScriptInstance {
  private sceneName = DEFAULT_SCENE_ID;
  private unsubscribers: Array<() => void> = [];

  constructor(private readonly ctx: ScriptCreateContext) {
    this.applyProperties(ctx.properties);
  }

  start(): void {
    this.bind();
  }

  onPropertiesChanged(
    properties: Readonly<Record<string, unknown>>,
  ): void {
    this.applyProperties(properties);
  }

  destroy(): void {
    this.unbind();
  }

  private applyProperties(raw: Readonly<Record<string, unknown>>): void {
    this.sceneName = readProps(raw).sceneName;
  }

  private unbind(): void {
    for (const off of this.unsubscribers) {
      off();
    }
    this.unsubscribers = [];
  }

  private bind(): void {
    this.unbind();
    const { onNodeClick, changeScene } = this.ctx.services;
    if (!onNodeClick) {
      return;
    }
    this.unsubscribers.push(
      onNodeClick(this.ctx.nodeId, () => {
        void changeScene(this.sceneName);
      }),
    );
  }
}

const PROPERTIES: ComponentDefinition["properties"] = {
  sceneName: {
    kind: "dynamicEnum",
    default: DEFAULT_SCENE_ID,
    source: "scenes",
  },
};

export const goSpineButtonComponent = defineComponent({
  id: "editor-features-demo.GoSpineButton",
  displayName: "Go Spine Button",
  category: "UI",
  categoryOrder: 20,
  order: 30,
  allowMultiple: false,
  properties: PROPERTIES,
  create: (ctx) => new GoSpineButtonBehaviour(ctx),
});

/** Re-attach create after a metadata-only catalog load (editor / preview). */
export function installGoSpineButtonRuntime(registry: ComponentRegistry): void {
  registry.attachRuntime(goSpineButtonComponent.id, goSpineButtonComponent.create);
}
