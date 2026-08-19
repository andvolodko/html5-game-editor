import {
  defineComponent,
  type ComponentDefinition,
  type ComponentRegistry,
  type ScriptCreateContext,
  type ScriptInstance,
} from "@game-editor/game-components";
import { pickRandomClipName } from "../action-clips.js";

const DEFAULT_MIN_DELAY_SECONDS = 0.8;
const DEFAULT_MAX_DELAY_SECONDS = 3.5;

type Props = {
  minDelay: number;
  maxDelay: number;
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

function readProps(raw: Readonly<Record<string, unknown>>): Props {
  return {
    minDelay: Math.max(0, readNumber(raw, "minDelay", DEFAULT_MIN_DELAY_SECONDS)),
    maxDelay: Math.max(0, readNumber(raw, "maxDelay", DEFAULT_MAX_DELAY_SECONDS)),
    enabled: raw.enabled !== false,
  };
}

export class CatapultIdleBehaviour implements ScriptInstance {
  private props: Props;
  private readonly ctx: ScriptCreateContext;
  private timer = 0;
  private lastClip: string | undefined;

  constructor(ctx: ScriptCreateContext) {
    this.ctx = ctx;
    this.props = readProps(ctx.properties);
  }

  start(): void {
    this.playNext();
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
      this.playNext();
    }
  }

  private playNext(): void {
    const names = this.ctx.animations.names();
    const clip = pickRandomClipName(names, this.lastClip);
    if (!clip) {
      this.timer = 0;
      return;
    }
    this.lastClip = clip;
    this.ctx.animations.play(clip, { loop: false });
    this.timer = this.ctx.animations.duration(clip) + this.randomDelay();
  }

  private randomDelay(): number {
    const min = this.props.minDelay;
    const max = Math.max(min, this.props.maxDelay);
    return min + Math.random() * (max - min);
  }
}

const PROPERTIES: ComponentDefinition["properties"] = {
  minDelay: {
    kind: "number",
    default: DEFAULT_MIN_DELAY_SECONDS,
    min: 0,
    step: 0.1,
  },
  maxDelay: {
    kind: "number",
    default: DEFAULT_MAX_DELAY_SECONDS,
    min: 0,
    step: 0.1,
  },
  enabled: { kind: "boolean", default: true },
};

export const catapultIdleComponent = defineComponent({
  id: "muonline.CatapultIdle",
  displayName: "Catapult Idle",
  category: "Gameplay",
  categoryOrder: 10,
  order: 30,
  allowMultiple: false,
  properties: PROPERTIES,
  create: (ctx) => new CatapultIdleBehaviour(ctx),
});

export function installCatapultIdleRuntime(registry: ComponentRegistry): void {
  registry.attachRuntime(catapultIdleComponent.id, catapultIdleComponent.create);
}
