import {
  defineComponent,
  type ComponentDefinition,
  type ComponentRegistry,
  type ScriptCreateContext,
  type ScriptInstance,
} from "@game-editor/game-components";

const DEFAULT_COUNT = 10;
const MIN_COUNT = 1;
const COLUMNS_PER_ROW = 15;

type Props = {
  objectName: string;
  count: number;
};

function readProps(raw: Readonly<Record<string, unknown>>): Props {
  const countRaw = typeof raw.count === "number" ? raw.count : DEFAULT_COUNT;
  return {
    objectName: typeof raw.objectName === "string" ? raw.objectName : "",
    count: Math.max(MIN_COUNT, Math.floor(countRaw)),
  };
}

/** On click, clones a named scene node (2D or 3D) `count` times. */
export class CloneObjectBehaviour implements ScriptInstance {
  private objectName = "";
  private count = DEFAULT_COUNT;
  private nextIndex = 0;
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
    const props = readProps(raw);
    this.objectName = props.objectName;
    this.count = props.count;
  }

  private unbind(): void {
    for (const off of this.unsubscribers) {
      off();
    }
    this.unsubscribers = [];
  }

  private bind(): void {
    this.unbind();
    const { onNodePointerEvent, onNodeClick, cloneNodeByName } =
      this.ctx.services;
    const handler = (): void => {
      if (!this.objectName || !cloneNodeByName) {
        return;
      }
      for (let i = 0; i < this.count; i += 1) {
        cloneNodeByName(this.objectName, this.nextIndex, COLUMNS_PER_ROW);
        this.nextIndex += 1;
      }
    };

    if (onNodePointerEvent) {
      this.unsubscribers.push(
        onNodePointerEvent(this.ctx.nodeId, "pointertap", handler),
      );
      return;
    }

    if (onNodeClick) {
      this.unsubscribers.push(onNodeClick(this.ctx.nodeId, handler));
    }
  }
}

const PROPERTIES: ComponentDefinition["properties"] = {
  objectName: {
    kind: "string",
    default: "",
  },
  count: {
    kind: "number",
    default: DEFAULT_COUNT,
    min: MIN_COUNT,
    step: 1,
  },
};

export const cloneObjectComponent = defineComponent({
  id: "editor-features-demo.CloneObject",
  displayName: "Clone Object",
  category: "Gameplay",
  categoryOrder: 10,
  order: 10,
  allowMultiple: false,
  properties: PROPERTIES,
  create: (ctx) => new CloneObjectBehaviour(ctx),
});

/** Re-attach create after a metadata-only catalog load (editor / preview). */
export function installCloneObjectRuntime(registry: ComponentRegistry): void {
  registry.attachRuntime(cloneObjectComponent.id, cloneObjectComponent.create);
}
