import {
  defineComponent,
  type ComponentDefinition,
  type ComponentRegistry,
  type ScriptCreateContext,
  type ScriptInstance,
} from "@game-editor/game-components";

const DEFAULT_SPEED = 120;
const DEFAULT_RANGE = 400;

type Props = {
  speed: number;
  range: number;
  enabled: boolean;
};

function readProps(raw: Readonly<Record<string, unknown>>): Props {
  return {
    speed: typeof raw.speed === "number" ? raw.speed : DEFAULT_SPEED,
    range: typeof raw.range === "number" ? raw.range : DEFAULT_RANGE,
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : true,
  };
}

/** Patrols left ↔ right; flips with `scale.x *= -1` at each turn. */
export class RaptorBehaviour implements ScriptInstance {
  private readonly props: Props;
  private readonly startX: number;
  private direction = 1;

  constructor(private readonly ctx: ScriptCreateContext) {
    this.props = readProps(ctx.properties);
    this.startX = ctx.services.getTransform2D?.(ctx.nodeId)?.position.x ?? 0;
  }

  update(dt: number): void {
    if (!this.props.enabled || dt <= 0) {
      return;
    }
    const { getTransform2D, setTransform2D } = this.ctx.services;
    if (!getTransform2D || !setTransform2D) {
      return;
    }

    const transform = getTransform2D(this.ctx.nodeId);
    if (!transform) {
      return;
    }

    const minX = this.startX;
    const maxX = this.startX + Math.max(0, this.props.range);
    let nextX = transform.position.x + this.direction * this.props.speed * dt;
    let scaleX = transform.scale.x;

    if (nextX >= maxX) {
      nextX = maxX;
      this.direction = -1;
      scaleX *= -1;
    } else if (nextX <= minX) {
      nextX = minX;
      this.direction = 1;
      scaleX *= -1;
    }

    setTransform2D(this.ctx.nodeId, {
      position: { x: nextX, y: transform.position.y },
      scale: { x: scaleX, y: transform.scale.y },
    });
  }
}

const PROPERTIES: ComponentDefinition["properties"] = {
  speed: {
    kind: "number",
    default: DEFAULT_SPEED,
    min: 0,
    step: 10,
  },
  range: {
    kind: "number",
    default: DEFAULT_RANGE,
    min: 0,
    step: 10,
  },
  enabled: { kind: "boolean", default: true },
};

export const raptorComponent = defineComponent({
  id: "example.Raptor",
  displayName: "Raptor",
  category: "Gameplay",
  categoryOrder: 10,
  order: 20,
  allowMultiple: false,
  properties: PROPERTIES,
  create: (ctx) => new RaptorBehaviour(ctx),
});

/** Re-attach create after a metadata-only catalog load (editor / preview). */
export function installRaptorRuntime(registry: ComponentRegistry): void {
  const existing = registry.get(raptorComponent.id);
  if (existing && raptorComponent.create) {
    existing.create = raptorComponent.create;
  }
}
