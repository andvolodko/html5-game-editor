import {
  defineComponent,
  seededUnitFloat,
  type ComponentDefinition,
  type ComponentRegistry,
  type ScriptCreateContext,
  type ScriptInstance,
} from "@game-editor/game-components";

const DEFAULT_SPEED = 0.18;
const DEFAULT_RANGE_X = 28;
const DEFAULT_RANGE_Y = 14;
const FULL_TURN = Math.PI * 2;
/** Keeps vertical drift off the same period as horizontal so the path is not a line. */
const VERTICAL_FREQUENCY_RATIO = 0.73;
const PHASE_SALT_X = 17;
const PHASE_SALT_Y = 41;

type Props = {
  speed: number;
  rangeX: number;
  rangeY: number;
};

function readProps(raw: Readonly<Record<string, unknown>>): Props {
  return {
    speed: typeof raw.speed === "number" ? raw.speed : DEFAULT_SPEED,
    rangeX: typeof raw.rangeX === "number" ? raw.rangeX : DEFAULT_RANGE_X,
    rangeY: typeof raw.rangeY === "number" ? raw.rangeY : DEFAULT_RANGE_Y,
  };
}

/** Drifts the host sprite a little left ↔ right and up ↔ down around its rest pose. */
export class CloudBehaviour implements ScriptInstance {
  private startX = 0;
  private startY = 0;
  private elapsed = 0;
  private angularSpeed = DEFAULT_SPEED * FULL_TURN;
  private rangeX = DEFAULT_RANGE_X;
  private rangeY = DEFAULT_RANGE_Y;
  private readonly phaseX: number;
  private readonly phaseY: number;

  constructor(private readonly ctx: ScriptCreateContext) {
    this.applyProperties(ctx.properties);
    this.phaseX = seededUnitFloat(ctx.nodeId, PHASE_SALT_X) * FULL_TURN;
    this.phaseY = seededUnitFloat(ctx.nodeId, PHASE_SALT_Y) * FULL_TURN;
  }

  start(): void {
    this.startX = this.ctx.transform.x;
    this.startY = this.ctx.transform.y;
  }

  update(dt: number): void {
    if (dt <= 0) {
      return;
    }

    this.elapsed += dt;
    const angle = this.elapsed * this.angularSpeed;
    this.ctx.transform.x =
      this.startX + Math.sin(angle + this.phaseX) * this.rangeX;
    this.ctx.transform.y =
      this.startY +
      Math.sin(angle * VERTICAL_FREQUENCY_RATIO + this.phaseY) * this.rangeY;
  }

  onPropertiesChanged(
    properties: Readonly<Record<string, unknown>>,
  ): void {
    this.applyProperties(properties);
  }

  private applyProperties(raw: Readonly<Record<string, unknown>>): void {
    const props = readProps(raw);
    this.angularSpeed = props.speed * FULL_TURN;
    this.rangeX = props.rangeX;
    this.rangeY = props.rangeY;
  }
}

const PROPERTIES: ComponentDefinition["properties"] = {
  speed: {
    kind: "number",
    default: DEFAULT_SPEED,
    min: 0,
    step: 0.01,
    description: "Oscillation cycles per second",
  },
  rangeX: {
    kind: "number",
    default: DEFAULT_RANGE_X,
    min: 0,
    step: 1,
  },
  rangeY: {
    kind: "number",
    default: DEFAULT_RANGE_Y,
    min: 0,
    step: 1,
  },
};

export const cloudComponent = defineComponent({
  id: "editor-features-demo.Cloud",
  displayName: "Cloud",
  category: "Gameplay",
  categoryOrder: 10,
  order: 30,
  allowMultiple: false,
  properties: PROPERTIES,
  create: (ctx) => new CloudBehaviour(ctx),
});

/** Re-attach create after a metadata-only catalog load (editor / preview). */
export function installCloudRuntime(registry: ComponentRegistry): void {
  registry.attachRuntime(cloudComponent.id, cloudComponent.create);
}
