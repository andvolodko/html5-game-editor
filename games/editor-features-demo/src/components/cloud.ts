import {
  defineComponent,
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
const HASH_MULTIPLIER = 31;
const UNSIGNED_32_RANGE = 0x1_0000_0000;
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

function phaseFromSeed(seed: string, salt: number): number {
  let hash = salt;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * HASH_MULTIPLIER + seed.charCodeAt(i)) | 0;
  }
  return ((hash >>> 0) / UNSIGNED_32_RANGE) * FULL_TURN;
}

/** Drifts the host sprite a little left ↔ right and up ↔ down around its rest pose. */
export class CloudBehaviour implements ScriptInstance {
  private readonly props: Props;
  private readonly startX: number;
  private readonly startY: number;
  private readonly phaseX: number;
  private readonly phaseY: number;
  private elapsed = 0;

  constructor(private readonly ctx: ScriptCreateContext) {
    this.props = readProps(ctx.properties);
    const transform = ctx.services.getTransform2D?.(ctx.nodeId);
    this.startX = transform?.position.x ?? 0;
    this.startY = transform?.position.y ?? 0;
    this.phaseX = phaseFromSeed(ctx.nodeId, PHASE_SALT_X);
    this.phaseY = phaseFromSeed(ctx.nodeId, PHASE_SALT_Y);
  }

  update(dt: number): void {
    if (dt <= 0) {
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

    this.elapsed += dt;
    const angularSpeed = this.props.speed * FULL_TURN;
    const nextX =
      this.startX +
      Math.sin(this.elapsed * angularSpeed + this.phaseX) * this.props.rangeX;
    const nextY =
      this.startY +
      Math.sin(
        this.elapsed * angularSpeed * VERTICAL_FREQUENCY_RATIO + this.phaseY,
      ) * this.props.rangeY;

    setTransform2D(this.ctx.nodeId, {
      position: { x: nextX, y: nextY },
    });
  }
}

const PROPERTIES: ComponentDefinition["properties"] = {
  speed: {
    kind: "number",
    default: DEFAULT_SPEED,
    min: 0,
    step: 0.01,
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
  const existing = registry.get(cloudComponent.id);
  if (existing && cloudComponent.create) {
    existing.create = cloudComponent.create;
  }
}
