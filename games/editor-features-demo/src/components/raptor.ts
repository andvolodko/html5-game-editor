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
  private startX = 0;
  private direction = 1;
  private speed = DEFAULT_SPEED;
  private range = DEFAULT_RANGE;
  private enabled = true;

  constructor(private readonly ctx: ScriptCreateContext) {
    this.applyProperties(ctx.properties);
  }

  start(): void {
    this.startX = this.ctx.transform.x;
  }

  update(dt: number): void {
    if (!this.enabled || dt <= 0) {
      return;
    }

    const minX = this.startX;
    const maxX = this.startX + Math.max(0, this.range);
    const transform = this.ctx.transform;
    let nextX = transform.x + this.direction * this.speed * dt;
    let scaleX = transform.scaleX;

    if (nextX >= maxX) {
      nextX = maxX;
      this.direction = -1;
      scaleX *= -1;
    } else if (nextX <= minX) {
      nextX = minX;
      this.direction = 1;
      scaleX *= -1;
    }

    transform.x = nextX;
    transform.scaleX = scaleX;
  }

  onPropertiesChanged(
    properties: Readonly<Record<string, unknown>>,
  ): void {
    this.applyProperties(properties);
  }

  private applyProperties(raw: Readonly<Record<string, unknown>>): void {
    const props = readProps(raw);
    this.speed = props.speed;
    this.range = props.range;
    this.enabled = props.enabled;
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
  id: "editor-features-demo.Raptor",
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
  registry.attachRuntime(raptorComponent.id, raptorComponent.create);
}
