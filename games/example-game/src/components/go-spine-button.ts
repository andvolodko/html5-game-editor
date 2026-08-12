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
  private readonly props: Props;
  private unsubscribers: Array<() => void> = [];

  constructor(private readonly ctx: ScriptCreateContext) {
    this.props = readProps(ctx.properties);
    this.onEnable();
  }

  private onEnable(): void {
    const { onNodeClick, changeScene } = this.ctx.services;
    if (!onNodeClick) {
      return;
    }
    this.unsubscribers.push(
      onNodeClick(this.ctx.nodeId, () => {
        void changeScene(this.props.sceneName);
      }),
    );
  }

  destroy(): void {
    for (const off of this.unsubscribers) {
      off();
    }
    this.unsubscribers = [];
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
  id: "example.GoSpineButton",
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
  const existing = registry.get(goSpineButtonComponent.id);
  if (existing && goSpineButtonComponent.create) {
    existing.create = goSpineButtonComponent.create;
  }
}
