import { defineComponent } from "../define-component.js";
import type {
  ComponentDefinition,
  NodePointerEventName,
  ScriptCreateContext,
  ScriptInstance,
} from "../types.js";
import { NODE_POINTER_EVENTS } from "../types.js";

const DEFAULT_MOUSE_EVENT: NodePointerEventName = "pointertap";

type Props = {
  audioAssetId: string;
  mouseEvent: NodePointerEventName;
};

function isNodePointerEventName(value: string): value is NodePointerEventName {
  return (NODE_POINTER_EVENTS as readonly string[]).includes(value);
}

function readProps(raw: Readonly<Record<string, unknown>>): Props {
  const mouseEventRaw =
    typeof raw.mouseEvent === "string" ? raw.mouseEvent : DEFAULT_MOUSE_EVENT;
  return {
    audioAssetId:
      typeof raw.audioAssetId === "string" ? raw.audioAssetId : "",
    mouseEvent: isNodePointerEventName(mouseEventRaw)
      ? mouseEventRaw
      : DEFAULT_MOUSE_EVENT,
  };
}

/**
 * Plays a catalogue audio asset when the host node receives the selected
 * playback pointer event (preview / runtime).
 */
export class AudioClickBehaviour implements ScriptInstance {
  private audioAssetId = "";
  private mouseEvent: NodePointerEventName = DEFAULT_MOUSE_EVENT;
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
    this.bind();
  }

  destroy(): void {
    this.unbind();
  }

  private applyProperties(raw: Readonly<Record<string, unknown>>): void {
    const props = readProps(raw);
    this.audioAssetId = props.audioAssetId;
    this.mouseEvent = props.mouseEvent;
  }

  private unbind(): void {
    for (const off of this.unsubscribers) {
      off();
    }
    this.unsubscribers = [];
  }

  private bind(): void {
    this.unbind();
    const { onNodePointerEvent, onNodeClick, playAudio } = this.ctx.services;
    const handler = (): void => {
      if (!this.audioAssetId || !playAudio) {
        return;
      }
      playAudio(this.audioAssetId);
    };

    if (onNodePointerEvent) {
      this.unsubscribers.push(
        onNodePointerEvent(this.ctx.nodeId, this.mouseEvent, handler),
      );
      return;
    }

    if (this.mouseEvent === "pointertap" && onNodeClick) {
      this.unsubscribers.push(onNodeClick(this.ctx.nodeId, handler));
    }
  }
}

const PROPERTIES: ComponentDefinition["properties"] = {
  audioAssetId: {
    kind: "asset",
    assetType: "audio",
    default: "",
  },
  mouseEvent: {
    kind: "enum",
    default: DEFAULT_MOUSE_EVENT,
    options: NODE_POINTER_EVENTS,
  },
};

export const audioClickComponent = defineComponent({
  id: "shared.AudioClick",
  displayName: "Audio Click",
  category: "Audio",
  categoryOrder: 15,
  order: 10,
  allowMultiple: true,
  properties: PROPERTIES,
  create: (ctx) => new AudioClickBehaviour(ctx),
});
