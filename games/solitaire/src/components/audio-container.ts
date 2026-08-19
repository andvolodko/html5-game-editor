import {
  defineComponent,
  type ComponentDefinition,
  type ComponentRegistry,
  type ScriptCreateContext,
  type ScriptInstance,
} from "@game-editor/game-components";

const DEFAULT_ON_CHILD = "on";
const DEFAULT_OFF_CHILD = "off";
const DEFAULT_HOVER_CHILD = "Hover";
const POINTER_CURSOR = "pointer";

type Props = {
  onChildName: string;
  offChildName: string;
  hoverChildName: string;
};

function readChildName(
  raw: Readonly<Record<string, unknown>>,
  key: string,
  fallback: string,
): string {
  const value = raw[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readProps(raw: Readonly<Record<string, unknown>>): Props {
  return {
    onChildName: readChildName(raw, "onChildName", DEFAULT_ON_CHILD),
    offChildName: readChildName(raw, "offChildName", DEFAULT_OFF_CHILD),
    hoverChildName: readChildName(raw, "hoverChildName", DEFAULT_HOVER_CHILD),
  };
}

function pointerTargetIds(
  nodeId: string,
  listChildNodes: ScriptCreateContext["services"]["listChildNodes"],
): string[] {
  const ids = [nodeId];
  for (const child of listChildNodes?.(nodeId) ?? []) {
    ids.push(child.id);
  }
  return ids;
}

/**
 * On/off buttons for gameplay audio. Enabling also retries clips the browser
 * blocked before a user gesture. Hover child (if present) is shown on pointerover.
 */
export class AudioContainerBehaviour implements ScriptInstance {
  private props: Props;
  private readonly ctx: ScriptCreateContext;
  private onId: string | undefined;
  private offId: string | undefined;
  private unsubscribers: Array<() => void> = [];

  constructor(ctx: ScriptCreateContext) {
    this.ctx = ctx;
    this.props = readProps(ctx.properties);
  }

  start(): void {
    this.bind();
  }

  onPropertiesChanged(
    properties: Readonly<Record<string, unknown>>,
  ): void {
    this.props = readProps(properties);
    this.bind();
  }

  private bind(): void {
    this.unbind();
    this.onEnable();
  }

  private unbind(): void {
    for (const off of this.unsubscribers) {
      off();
    }
    this.unsubscribers = [];
  }

  private onEnable(): void {
    const { listChildNodes, setNodeCursor, onNodePointerEvent } =
      this.ctx.services;
    const children = listChildNodes?.(this.ctx.nodeId) ?? [];
    this.onId = children.find(
      (child) => child.name === this.props.onChildName,
    )?.id;
    this.offId = children.find(
      (child) => child.name === this.props.offChildName,
    )?.id;

    for (const buttonId of [this.onId, this.offId]) {
      if (!buttonId) {
        continue;
      }
      this.setHoverVisible(buttonId, false);
      for (const nodeId of pointerTargetIds(buttonId, listChildNodes)) {
        setNodeCursor?.(nodeId, POINTER_CURSOR);
      }
    }

    if (!onNodePointerEvent) {
      return;
    }
    this.bindButton(this.onId, true);
    this.bindButton(this.offId, false);
  }

  private bindButton(buttonId: string | undefined, enableAudio: boolean): void {
    const { onNodePointerEvent, setAudioEnabled } = this.ctx.services;
    if (!buttonId || !onNodePointerEvent) {
      return;
    }
    this.unsubscribers.push(
      onNodePointerEvent(buttonId, "pointertap", () => {
        setAudioEnabled?.(enableAudio);
      }),
      onNodePointerEvent(buttonId, "pointerover", () => {
        this.setHoverVisible(buttonId, true);
      }),
      onNodePointerEvent(buttonId, "pointerout", () => {
        this.setHoverVisible(buttonId, false);
      }),
    );
  }

  private setHoverVisible(buttonId: string, hovered: boolean): void {
    const hoverId = this.ctx.services
      .listChildNodes?.(buttonId)
      ?.find((child) => child.name === this.props.hoverChildName)?.id;
    if (!hoverId) {
      return;
    }
    this.ctx.services.setNodeVisible?.(hoverId, hovered);
  }

  destroy(): void {
    this.unbind();
  }
}

const PROPERTIES: ComponentDefinition["properties"] = {
  onChildName: {
    kind: "string",
    default: DEFAULT_ON_CHILD,
  },
  offChildName: {
    kind: "string",
    default: DEFAULT_OFF_CHILD,
  },
  hoverChildName: {
    kind: "string",
    default: DEFAULT_HOVER_CHILD,
  },
};

export const audioContainerComponent = defineComponent({
  id: "solitaire.AudioContainer",
  displayName: "Audio Container",
  category: "UI",
  categoryOrder: 20,
  order: 15,
  allowMultiple: false,
  properties: PROPERTIES,
  create: (ctx) => new AudioContainerBehaviour(ctx),
});

export function installAudioContainerRuntime(registry: ComponentRegistry): void {
  registry.attachRuntime(audioContainerComponent.id, audioContainerComponent.create);
}
