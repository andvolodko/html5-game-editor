import {
  defineComponent,
  type ComponentDefinition,
  type ComponentRegistry,
  type ScriptCreateContext,
  type ScriptInstance,
  type ScriptRuntimeServices,
} from "@game-editor/game-components";
import { lookAtEulerXyz } from "../look-at-euler.js";

const DEFAULT_LOOK_AT_X = 0;
const DEFAULT_LOOK_AT_Y = 6;
const DEFAULT_LOOK_AT_Z = 0;
const DEFAULT_RADIUS = 32;
const DEFAULT_HEIGHT = 30;
const DEFAULT_SPEED = 0.055;
const DEFAULT_SMOOTHING = 2.2;
const DEFAULT_FLY_MIN_SECONDS = 8;
const DEFAULT_FLY_MAX_SECONDS = 16;
const DEFAULT_PAUSE_MIN_SECONDS = 2.5;
const DEFAULT_PAUSE_MAX_SECONDS = 5.5;

type Phase = "fly" | "pause";

type Props = {
  lookAtX: number;
  lookAtY: number;
  lookAtZ: number;
  radius: number;
  height: number;
  speed: number;
  smoothing: number;
  flyMin: number;
  flyMax: number;
  pauseMin: number;
  pauseMax: number;
  enabled: boolean;
};

function readNumber(
  raw: Readonly<Record<string, unknown>>,
  key: string,
  fallback: number,
): number {
  const value = raw[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readProps(raw: Readonly<Record<string, unknown>>): Props {
  return {
    lookAtX: readNumber(raw, "lookAtX", DEFAULT_LOOK_AT_X),
    lookAtY: readNumber(raw, "lookAtY", DEFAULT_LOOK_AT_Y),
    lookAtZ: readNumber(raw, "lookAtZ", DEFAULT_LOOK_AT_Z),
    radius: Math.max(1, readNumber(raw, "radius", DEFAULT_RADIUS)),
    height: readNumber(raw, "height", DEFAULT_HEIGHT),
    speed: Math.max(0, readNumber(raw, "speed", DEFAULT_SPEED)),
    smoothing: Math.max(0.1, readNumber(raw, "smoothing", DEFAULT_SMOOTHING)),
    flyMin: Math.max(0, readNumber(raw, "flyMin", DEFAULT_FLY_MIN_SECONDS)),
    flyMax: Math.max(0, readNumber(raw, "flyMax", DEFAULT_FLY_MAX_SECONDS)),
    pauseMin: Math.max(0, readNumber(raw, "pauseMin", DEFAULT_PAUSE_MIN_SECONDS)),
    pauseMax: Math.max(0, readNumber(raw, "pauseMax", DEFAULT_PAUSE_MAX_SECONDS)),
    enabled: raw.enabled !== false,
  };
}

function randomDuration(minSeconds: number, maxSeconds: number): number {
  const min = Math.min(minSeconds, maxSeconds);
  const max = Math.max(minSeconds, maxSeconds);
  return min + Math.random() * (max - min);
}

function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export class BattlefieldCameraBehaviour implements ScriptInstance {
  private props: Props;
  private readonly services: ScriptRuntimeServices;
  private readonly nodeId: string;
  private angle = 0;
  private omega = 0;
  private phase: Phase = "fly";
  private timer = 0;

  constructor(ctx: ScriptCreateContext) {
    this.nodeId = ctx.nodeId;
    this.services = ctx.services;
    this.props = readProps(ctx.properties);
  }

  start(): void {
    const position = this.services.getTransform3D?.(this.nodeId)?.position;
    this.angle = Math.atan2(
      (position?.x ?? this.props.radius) - this.props.lookAtX,
      (position?.z ?? this.props.radius) - this.props.lookAtZ,
    );
    this.timer = randomDuration(this.props.flyMin, this.props.flyMax);
    this.applyPose();
  }

  onPropertiesChanged(
    properties: Readonly<Record<string, unknown>>,
  ): void {
    this.props = readProps(properties);
  }

  update(dt: number): void {
    if (!this.props.enabled || dt <= 0) {
      return;
    }
    this.timer -= dt;
    if (this.timer <= 0) {
      this.togglePhase();
    }
    const targetOmega = this.phase === "fly" ? this.props.speed : 0;
    this.omega = damp(this.omega, targetOmega, this.props.smoothing, dt);
    this.angle += this.omega * dt;
    this.applyPose();
  }

  private togglePhase(): void {
    if (this.phase === "fly") {
      this.phase = "pause";
      this.timer = randomDuration(this.props.pauseMin, this.props.pauseMax);
      return;
    }
    this.phase = "fly";
    this.timer = randomDuration(this.props.flyMin, this.props.flyMax);
  }

  private applyPose(): void {
    const { lookAtX, lookAtY, lookAtZ, radius, height } = this.props;
    const position = {
      x: lookAtX + Math.sin(this.angle) * radius,
      y: height,
      z: lookAtZ + Math.cos(this.angle) * radius,
    };
    this.services.setTransform3D?.(this.nodeId, {
      position,
      rotation: lookAtEulerXyz(position, {
        x: lookAtX,
        y: lookAtY,
        z: lookAtZ,
      }),
    });
  }
}

const PROPERTIES: ComponentDefinition["properties"] = {
  lookAtX: { kind: "number", default: DEFAULT_LOOK_AT_X, step: 0.5 },
  lookAtY: { kind: "number", default: DEFAULT_LOOK_AT_Y, step: 0.5 },
  lookAtZ: { kind: "number", default: DEFAULT_LOOK_AT_Z, step: 0.5 },
  radius: { kind: "number", default: DEFAULT_RADIUS, min: 1, step: 1 },
  height: { kind: "number", default: DEFAULT_HEIGHT, step: 0.5 },
  speed: { kind: "number", default: DEFAULT_SPEED, min: 0, step: 0.01 },
  smoothing: { kind: "number", default: DEFAULT_SMOOTHING, min: 0.1, step: 0.1 },
  flyMin: { kind: "number", default: DEFAULT_FLY_MIN_SECONDS, min: 0, step: 0.5 },
  flyMax: { kind: "number", default: DEFAULT_FLY_MAX_SECONDS, min: 0, step: 0.5 },
  pauseMin: {
    kind: "number",
    default: DEFAULT_PAUSE_MIN_SECONDS,
    min: 0,
    step: 0.5,
  },
  pauseMax: {
    kind: "number",
    default: DEFAULT_PAUSE_MAX_SECONDS,
    min: 0,
    step: 0.5,
  },
  enabled: { kind: "boolean", default: true },
};

export const battlefieldCameraComponent = defineComponent({
  id: "muonline.BattlefieldCamera",
  displayName: "Battlefield Camera",
  category: "Camera",
  categoryOrder: 12,
  order: 10,
  allowMultiple: false,
  properties: PROPERTIES,
  create: (ctx) => new BattlefieldCameraBehaviour(ctx),
});

export function installBattlefieldCameraRuntime(
  registry: ComponentRegistry,
): void {
  registry.attachRuntime(
    battlefieldCameraComponent.id,
    battlefieldCameraComponent.create,
  );
}
