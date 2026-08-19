import { defineComponent } from "../define-component.js";
import type {
  ComponentDefinition,
  ScriptCreateContext,
  ScriptInstance,
} from "../types.js";

const DEFAULT_REGULAR_CHILD = "regular";
const DEFAULT_PRESSED_CHILD = "pressed";
const DEFAULT_TEXT_REGULAR_CHILD = "text-regular";
const DEFAULT_TEXT_PRESSED_CHILD = "text-pressed";
const POINTER_CURSOR = "pointer";

type Props = {
  regularChildName: string;
  pressedChildName: string;
  textRegularChildName: string;
  textPressedChildName: string;
};

function namedChild(raw: unknown, fallback: string): string {
  return typeof raw === "string" && raw.length > 0 ? raw : fallback;
}

function readProps(raw: Readonly<Record<string, unknown>>): Props {
  return {
    regularChildName: namedChild(raw.regularChildName, DEFAULT_REGULAR_CHILD),
    pressedChildName: namedChild(raw.pressedChildName, DEFAULT_PRESSED_CHILD),
    textRegularChildName: namedChild(
      raw.textRegularChildName,
      DEFAULT_TEXT_REGULAR_CHILD,
    ),
    textPressedChildName: namedChild(
      raw.textPressedChildName,
      DEFAULT_TEXT_PRESSED_CHILD,
    ),
  };
}

function findChildId(
  children: ReadonlyArray<{ id: string; name: string }>,
  name: string,
): string | undefined {
  return children.find((child) => child.name === name)?.id;
}

function setPairVisible(
  ctx: ScriptCreateContext,
  regularId: string | undefined,
  pressedId: string | undefined,
  pressed: boolean,
): void {
  if (regularId) {
    const node = ctx.scene.getNode(regularId);
    if (node) {
      node.visible = !pressed;
    }
  }
  if (pressedId) {
    const node = ctx.scene.getNode(pressedId);
    if (node) {
      node.visible = pressed;
    }
  }
}

function pointerTargetIds(ctx: ScriptCreateContext): string[] {
  const ids = [ctx.nodeId];
  for (const child of ctx.node.children) {
    ids.push(child.id);
  }
  return ids;
}

/**
 * Swaps child visuals named regular/pressed (and optional text-regular /
 * text-pressed labels) and shows a pointer cursor.
 * An enabled HitZone on the host container is an optional pointer target:
 * child visuals stay visible but are not the click/hover region.
 */
export class ButtonBehaviour implements ScriptInstance {
  private regularChildName = DEFAULT_REGULAR_CHILD;
  private pressedChildName = DEFAULT_PRESSED_CHILD;
  private textRegularChildName = DEFAULT_TEXT_REGULAR_CHILD;
  private textPressedChildName = DEFAULT_TEXT_PRESSED_CHILD;
  private regularId: string | undefined;
  private pressedId: string | undefined;
  private textRegularId: string | undefined;
  private textPressedId: string | undefined;
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
    this.regularChildName = props.regularChildName;
    this.pressedChildName = props.pressedChildName;
    this.textRegularChildName = props.textRegularChildName;
    this.textPressedChildName = props.textPressedChildName;
  }

  private unbind(): void {
    for (const off of this.unsubscribers) {
      off();
    }
    this.unsubscribers = [];
  }

  private bind(): void {
    this.unbind();
    const { setNodeCursor, onNodePointerEvent } = this.ctx.services;
    const children = this.ctx.node.children;
    this.regularId = findChildId(children, this.regularChildName);
    this.pressedId = findChildId(children, this.pressedChildName);
    this.textRegularId = findChildId(children, this.textRegularChildName);
    this.textPressedId = findChildId(children, this.textPressedChildName);

    this.applyPressed(false);

    const hostHasHitZone =
      this.ctx.services.hasHitZone?.(this.ctx.nodeId) === true;
    const cursorIds = hostHasHitZone
      ? [this.ctx.nodeId]
      : pointerTargetIds(this.ctx);
    for (const nodeId of cursorIds) {
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
    setPairVisible(this.ctx, this.regularId, this.pressedId, pressed);
    setPairVisible(this.ctx, this.textRegularId, this.textPressedId, pressed);
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
  textRegularChildName: {
    kind: "string",
    default: DEFAULT_TEXT_REGULAR_CHILD,
  },
  textPressedChildName: {
    kind: "string",
    default: DEFAULT_TEXT_PRESSED_CHILD,
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
