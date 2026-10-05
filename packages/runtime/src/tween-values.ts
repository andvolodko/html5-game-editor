import type {
  TweenChannel,
  TweenChannelValues,
  TweenNumeric,
  TweenPlayMode,
} from "@game-editor/game-components";

const RELATIVE_ADD_PREFIX = "+=";
const RELATIVE_SUB_PREFIX = "-=";

export interface ResolvedTweenChannels {
  readonly channels: ReadonlySet<TweenChannel>;
  readonly from: ReadonlyMap<TweenChannel, TweenNumeric>;
  readonly to: ReadonlyMap<TweenChannel, TweenNumeric>;
}

function assign(
  target: Map<TweenChannel, TweenNumeric>,
  channel: TweenChannel,
  value: TweenNumeric | undefined,
): void {
  if (typeof value === "number") {
    if (Number.isFinite(value)) {
      target.set(channel, value);
    }
    return;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    target.set(channel, value.trim());
  }
}

function readValues(
  values: TweenChannelValues | undefined,
): Map<TweenChannel, TweenNumeric> {
  const target = new Map<TweenChannel, TweenNumeric>();
  if (!values) {
    return target;
  }
  assign(target, "x", values.x);
  assign(target, "y", values.y);
  assign(target, "rotation", values.rotation);
  if (values.scale !== undefined) {
    assign(target, "scaleX", values.scale);
    assign(target, "scaleY", values.scale);
  }
  assign(target, "scaleX", values.scaleX);
  assign(target, "scaleY", values.scaleY);
  assign(target, "alpha", values.alpha);
  return target;
}

export function resolveTweenChannels(
  mode: TweenPlayMode,
  from: TweenChannelValues | undefined,
  to: TweenChannelValues | undefined,
): ResolvedTweenChannels {
  const fromMap = readValues(mode === "to" ? undefined : from);
  const toMap = readValues(mode === "from" ? undefined : to);
  const channels = new Set<TweenChannel>([...fromMap.keys(), ...toMap.keys()]);
  return { channels, from: fromMap, to: toMap };
}

/** `+=n` / `-=n` (and tween.js `+n` / `-n`) apply to `current`. Other numbers are absolute. */
export function resolveTweenValue(
  current: number,
  value: TweenNumeric,
): number {
  if (typeof value === "number") {
    return value;
  }
  const trimmed = value.trim();
  if (trimmed.startsWith(RELATIVE_ADD_PREFIX)) {
    const delta = Number(trimmed.slice(RELATIVE_ADD_PREFIX.length));
    return Number.isFinite(delta) ? current + delta : current;
  }
  if (trimmed.startsWith(RELATIVE_SUB_PREFIX)) {
    const delta = Number(trimmed.slice(RELATIVE_SUB_PREFIX.length));
    return Number.isFinite(delta) ? current - delta : current;
  }
  if (trimmed.startsWith("+") || trimmed.startsWith("-")) {
    const delta = Number(trimmed);
    return Number.isFinite(delta) ? current + delta : current;
  }
  const absolute = Number(trimmed);
  return Number.isFinite(absolute) ? absolute : current;
}
