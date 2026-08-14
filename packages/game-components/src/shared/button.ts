import { defineComponent } from "../define-component.js";
import type {
  ComponentDefinition,
  ScriptCreateContext,
  ScriptInstance,
} from "../types.js";

const DEFAULT_REGULAR_CHILD = "regular";
const DEFAULT_PRESSED_CHILD = "pressed";
const POINTER_CURSOR = "pointer";

type Props = {
  regularChildName: string;
  pressedChildName: string;
};

function readProps(raw: Readonly<Record<string, unknown>>): Props {
  return {
    regularChildName:
      typeof raw.regularChildName === "string" && raw.regularChildName.length > 0
        ? raw.regularChildName
        : DEFAULT_REGULAR_CHILD,
    pressedChildName:
      typeof raw.pressedChildName === "string" && raw.pressedChildName.length > 0
        ? raw.pressedChildName
        : DEFAULT_PRESSED_CHILD,
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
 * Swaps child visuals named regular/pressed and shows a pointer cursor.
 */
export class ButtonBehaviour implements ScriptInstance {
  private readonly props: Props;
  private regularId: string | undefined;
  private pressedId: string | undefined;
  private unsubscribers: Array<() => void> = [];

  constructor(private readonly ctx: ScriptCreateContext) {
    this.props = readProps(ctx.properties);
    this.onEnable();
  }

  private onEnable(): void {
    const { listChildNodes, setNodeCursor, onNodePointerEvent } =
      this.ctx.services;
    const children = listChildNodes?.(this.ctx.nodeId) ?? [];
    this.regularId = children.find(
      (child) => child.name === this.props.regularChildName,
    )?.id;
    this.pressedId = children.find(
      (child) => child.name === this.props.pressedChildName,
    )?.id;

    this.applyPressed(false);

    for (const nodeId of pointerTargetIds(this.ctx.nodeId, listChildNodes)) {
      setNodeCursor?.(nodeId, POINTER_CURSOR);
    }

    if (!onNodePointerEvent) {
      return;
    }
    this.unsubscribers.push(
      onNodePointerEvent(this.ctx.nodeId, "pointerdown", () => {
        this.applyPressed(true);
      }),
      onNodePointerEvent(this.ctx.nodeId, "pointerup", () => {
        this.applyPressed(false);
      }),
    );
  }

  private applyPressed(pressed: boolean): void {
    const { setNodeVisible } = this.ctx.services;
    if (!setNodeVisible) {
      return;
    }
    if (this.regularId) {
      setNodeVisible(this.regularId, !pressed);
    }
    if (this.pressedId) {
      setNodeVisible(this.pressedId, pressed);
    }
  }

  destroy(): void {
    for (const off of this.unsubscribers) {
      off();
    }
    this.unsubscribers = [];
  }
}

const PROPERTIES: ComponentDefinition["properties"] = {
  regularChildName: {
    kind: "string",
    default: DEFAULT_REGULAR_CHILD,
  },
  pressedChildName: {
    kind: "string",
    default: DEFAULT_PRESSED_CHILD,
  },
};

export const buttonComponent = defineComponent({
  id: "shared.Button",
  displayName: "Button",
  category: "UI",
  categoryOrder: 20,
  order: 5,
  allowMultiple: false,
  properties: PROPERTIES,
  create: (ctx) => new ButtonBehaviour(ctx),
});
