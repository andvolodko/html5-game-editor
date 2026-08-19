import {
  defineComponent,
  type ComponentDefinition,
  type ComponentRegistry,
  type ScriptCreateContext,
  type ScriptInstance,
} from "@game-editor/game-components";

const DEFAULT_SPEED = 140;
const DEFAULT_IDLE_ANIM = "Idle";
const DEFAULT_RUN_ANIM = "Run";
const DEFAULT_ATTACK_ANIM = "Attack";
const DEFAULT_IDLE_MIN_SECONDS = 1;
const DEFAULT_IDLE_MAX_SECONDS = 2.4;
const DEFAULT_RUN_MIN_SECONDS = 1.6;
const DEFAULT_RUN_MAX_SECONDS = 3.2;
const DEFAULT_ATTACK_MIN_SECONDS = 0.8;
const DEFAULT_ATTACK_MAX_SECONDS = 1.8;
/** Matches `project.json` resolution so units wander the full design viewport. */
const VIEWPORT_WIDTH = 1920;
const VIEWPORT_HEIGHT = 1080;
const DEFAULT_MARGIN = 96;
const DEFAULT_MIN_X = DEFAULT_MARGIN;
const DEFAULT_MAX_X = VIEWPORT_WIDTH - DEFAULT_MARGIN;
const DEFAULT_MIN_Y = DEFAULT_MARGIN;
const DEFAULT_MAX_Y = VIEWPORT_HEIGHT - DEFAULT_MARGIN;
const ARRIVE_DISTANCE_PX = 4;
const FACE_DEADZONE_PX = 0.5;

const UNIT_STATES = ["idle", "run", "attack"] as const;

type UnitState = (typeof UNIT_STATES)[number];

type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

type Props = {
  idleAnim: string;
  runAnim: string;
  attackAnim: string;
  idleMinSeconds: number;
  idleMaxSeconds: number;
  runMinSeconds: number;
  runMaxSeconds: number;
  attackMinSeconds: number;
  attackMaxSeconds: number;
  speed: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  enabled: boolean;
};

function readNumber(
  raw: Readonly<Record<string, unknown>>,
  key: string,
  fallback: number,
): number {
  const value = raw[key];
  return typeof value === "number" ? value : fallback;
}

function readString(
  raw: Readonly<Record<string, unknown>>,
  key: string,
  fallback: string,
): string {
  const value = raw[key];
  return typeof value === "string" ? value : fallback;
}

function readProps(raw: Readonly<Record<string, unknown>>): Props {
  return {
    idleAnim: readString(raw, "idleAnim", DEFAULT_IDLE_ANIM),
    runAnim: readString(raw, "runAnim", DEFAULT_RUN_ANIM),
    attackAnim: readString(raw, "attackAnim", DEFAULT_ATTACK_ANIM),
    idleMinSeconds: readNumber(raw, "idleMinSeconds", DEFAULT_IDLE_MIN_SECONDS),
    idleMaxSeconds: readNumber(raw, "idleMaxSeconds", DEFAULT_IDLE_MAX_SECONDS),
    runMinSeconds: readNumber(raw, "runMinSeconds", DEFAULT_RUN_MIN_SECONDS),
    runMaxSeconds: readNumber(raw, "runMaxSeconds", DEFAULT_RUN_MAX_SECONDS),
    attackMinSeconds: readNumber(
      raw,
      "attackMinSeconds",
      DEFAULT_ATTACK_MIN_SECONDS,
    ),
    attackMaxSeconds: readNumber(
      raw,
      "attackMaxSeconds",
      DEFAULT_ATTACK_MAX_SECONDS,
    ),
    speed: readNumber(raw, "speed", DEFAULT_SPEED),
    minX: readNumber(raw, "minX", DEFAULT_MIN_X),
    maxX: readNumber(raw, "maxX", DEFAULT_MAX_X),
    minY: readNumber(raw, "minY", DEFAULT_MIN_Y),
    maxY: readNumber(raw, "maxY", DEFAULT_MAX_Y),
    enabled: raw.enabled !== false,
  };
}

function randomInRange(min: number, max: number): number {
  if (max <= min) {
    return min;
  }
  return min + Math.random() * (max - min);
}

function boundsOf(props: Props): Bounds {
  return {
    minX: Math.min(props.minX, props.maxX),
    maxX: Math.max(props.minX, props.maxX),
    minY: Math.min(props.minY, props.maxY),
    maxY: Math.max(props.minY, props.maxY),
  };
}

function clampToBounds(x: number, y: number, bounds: Bounds): {
  x: number;
  y: number;
} {
  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, y)),
  };
}

function pickOtherState(current: UnitState): UnitState {
  const others = UNIT_STATES.filter((state) => state !== current);
  const index = Math.floor(Math.random() * others.length);
  return others[index] ?? "idle";
}

function durationFor(state: UnitState, props: Props): number {
  if (state === "idle") {
    return randomInRange(props.idleMinSeconds, props.idleMaxSeconds);
  }
  if (state === "run") {
    return randomInRange(props.runMinSeconds, props.runMaxSeconds);
  }
  return randomInRange(props.attackMinSeconds, props.attackMaxSeconds);
}

function clipFor(state: UnitState, props: Props): string {
  if (state === "idle") {
    return props.idleAnim;
  }
  if (state === "run") {
    return props.runAnim;
  }
  return props.attackAnim;
}

/** Random idle / run / attack on an AnimatedSprite; wanders the design viewport while running. */
export class UnitLogicBehaviour implements ScriptInstance {
  private props: Props;
  private state: UnitState = "idle";
  private timer = 0;
  private targetX = 0;
  private targetY = 0;
  private started = false;

  constructor(private readonly ctx: ScriptCreateContext) {
    this.props = readProps(ctx.properties);
  }

  start(): void {
    this.started = true;
    this.enterState("idle");
  }

  onPropertiesChanged(
    properties: Readonly<Record<string, unknown>>,
  ): void {
    const previousClip = clipFor(this.state, this.props);
    this.props = readProps(properties);
    if (this.started && clipFor(this.state, this.props) !== previousClip) {
      this.playCurrentClip();
    }
  }

  update(dt: number): void {
    if (!this.props.enabled || !this.started || dt <= 0) {
      return;
    }

    if (this.state === "run") {
      this.moveTowardTarget(dt);
    }

    this.timer -= dt;
    if (this.timer > 0) {
      return;
    }
    this.enterState(pickOtherState(this.state));
  }

  private enterState(state: UnitState): void {
    this.state = state;
    this.timer = Math.max(0, durationFor(state, this.props));
    if (state === "run") {
      this.pickRunTarget();
    }
    this.playCurrentClip();
  }

  private playCurrentClip(): void {
    const animation = clipFor(this.state, this.props);
    if (animation.length === 0) {
      return;
    }
    this.ctx.services.setAnimatedSpritePlayback?.(this.ctx.nodeId, {
      animation,
      loop: true,
      playing: true,
    });
  }

  private pickRunTarget(): void {
    const bounds = boundsOf(this.props);
    this.targetX = randomInRange(bounds.minX, bounds.maxX);
    this.targetY = randomInRange(bounds.minY, bounds.maxY);
  }

  private moveTowardTarget(dt: number): void {
    const bounds = boundsOf(this.props);
    const transform = this.ctx.transform;
    const current = clampToBounds(transform.x, transform.y, bounds);
    const dx = this.targetX - current.x;
    const dy = this.targetY - current.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= ARRIVE_DISTANCE_PX) {
      transform.x = this.targetX;
      transform.y = this.targetY;
      this.pickRunTarget();
      return;
    }

    const step = Math.min(this.props.speed * dt, distance);
    const nextX = current.x + (dx / distance) * step;
    const nextY = current.y + (dy / distance) * step;
    const next = clampToBounds(nextX, nextY, bounds);
    transform.x = next.x;
    transform.y = next.y;
    this.faceHorizontal(dx);
  }

  private faceHorizontal(dx: number): void {
    if (Math.abs(dx) < FACE_DEADZONE_PX) {
      return;
    }
    const magnitude = Math.abs(this.ctx.transform.scaleX) || 1;
    this.ctx.transform.scaleX = dx < 0 ? -magnitude : magnitude;
  }
}

const PROPERTIES: ComponentDefinition["properties"] = {
  idleAnim: {
    kind: "string",
    default: DEFAULT_IDLE_ANIM,
    description: "Aseprite tag for idle",
  },
  runAnim: {
    kind: "string",
    default: DEFAULT_RUN_ANIM,
    description: "Aseprite tag for run",
  },
  attackAnim: {
    kind: "string",
    default: DEFAULT_ATTACK_ANIM,
    description: "Aseprite tag for attack",
  },
  idleMinSeconds: {
    kind: "number",
    default: DEFAULT_IDLE_MIN_SECONDS,
    min: 0,
    step: 0.1,
  },
  idleMaxSeconds: {
    kind: "number",
    default: DEFAULT_IDLE_MAX_SECONDS,
    min: 0,
    step: 0.1,
  },
  runMinSeconds: {
    kind: "number",
    default: DEFAULT_RUN_MIN_SECONDS,
    min: 0,
    step: 0.1,
  },
  runMaxSeconds: {
    kind: "number",
    default: DEFAULT_RUN_MAX_SECONDS,
    min: 0,
    step: 0.1,
  },
  attackMinSeconds: {
    kind: "number",
    default: DEFAULT_ATTACK_MIN_SECONDS,
    min: 0,
    step: 0.1,
  },
  attackMaxSeconds: {
    kind: "number",
    default: DEFAULT_ATTACK_MAX_SECONDS,
    min: 0,
    step: 0.1,
  },
  speed: {
    kind: "number",
    default: DEFAULT_SPEED,
    min: 0,
    step: 10,
    description: "Run speed in pixels per second",
  },
  minX: { kind: "number", default: DEFAULT_MIN_X, step: 8 },
  maxX: { kind: "number", default: DEFAULT_MAX_X, step: 8 },
  minY: { kind: "number", default: DEFAULT_MIN_Y, step: 8 },
  maxY: { kind: "number", default: DEFAULT_MAX_Y, step: 8 },
  enabled: { kind: "boolean", default: true },
};

export const unitLogicComponent = defineComponent({
  id: "editor-features-demo.UnitLogic",
  displayName: "Unit Logic",
  category: "Gameplay",
  categoryOrder: 10,
  order: 40,
  allowMultiple: false,
  properties: PROPERTIES,
  create: (ctx) => new UnitLogicBehaviour(ctx),
});

/** Re-attach create after a metadata-only catalog load (editor / preview). */
export function installUnitLogicRuntime(registry: ComponentRegistry): void {
  registry.attachRuntime(unitLogicComponent.id, unitLogicComponent.create);
}
