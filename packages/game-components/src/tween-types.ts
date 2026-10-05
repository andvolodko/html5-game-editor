/** Seconds. Matches GSAP's default tween duration. */
export const DEFAULT_TWEEN_DURATION_SECONDS = 0.5;

/** GSAP `repeat: -1`. */
export const TWEEN_INFINITE_REPEAT = -1;

export const DEFAULT_TWEEN_EASE = "power1.out";

const EASE_BASES = [
  "power1",
  "power2",
  "power3",
  "power4",
  "sine",
  "expo",
  "circ",
  "back",
  "elastic",
  "bounce",
] as const;

const EASE_SUFFIXES = ["in", "out", "inOut"] as const;

export type TweenEaseName =
  | "linear"
  | `${(typeof EASE_BASES)[number]}.${(typeof EASE_SUFFIXES)[number]}`;

const EASE_BASE_SET = new Set<string>(EASE_BASES);
const EASE_SUFFIX_SET = new Set<string>(EASE_SUFFIXES);

export function isTweenEaseName(value: string): value is TweenEaseName {
  if (value === "linear") {
    return true;
  }
  const [base, suffix, extra] = value.split(".");
  return (
    extra === undefined &&
    base !== undefined &&
    suffix !== undefined &&
    EASE_BASE_SET.has(base) &&
    EASE_SUFFIX_SET.has(suffix)
  );
}

export const TWEEN_CHANNELS = [
  "x",
  "y",
  "rotation",
  "scaleX",
  "scaleY",
  "alpha",
] as const;

export type TweenChannel = (typeof TWEEN_CHANNELS)[number];

/** Absolute number, or a GSAP-style relative string (`+=n` / `-=n`). */
export type TweenNumeric = number | string;

export interface TweenChannelValues {
  x?: TweenNumeric;
  y?: TweenNumeric;
  rotation?: TweenNumeric;
  scaleX?: TweenNumeric;
  scaleY?: TweenNumeric;
  /** Sets both `scaleX` and `scaleY`. */
  scale?: TweenNumeric;
  alpha?: TweenNumeric;
}

export interface TweenPlaybackOptions {
  /** Seconds. Default {@link DEFAULT_TWEEN_DURATION_SECONDS}. */
  duration?: number;
  /** Seconds before the tween starts. Relative values resolve after this. */
  delay?: number;
  ease?: TweenEaseName;
  /** Extra plays after the first. `-1` repeats forever. */
  repeat?: number;
  yoyo?: boolean;
  /** Seconds to wait between repeats. */
  repeatDelay?: number;
  /** Seconds between targets when the target is a list. */
  stagger?: number;
  onStart?: () => void;
  onUpdate?: () => void;
  onComplete?: () => void;
}

export type TweenVars = TweenChannelValues & TweenPlaybackOptions;

export type TweenTarget = string | readonly string[];

/** Omitted appends at the timeline end. A number is absolute seconds. `+=n` / `-=n` offset that end. */
export type TweenTimelinePosition = number | string;

export interface ScriptTweenTimelineOptions {
  repeat?: number;
  yoyo?: boolean;
  /** Seconds before the first child. */
  delay?: number;
}

export interface TweenHandle {
  readonly id: string;
  kill(): void;
}

export interface TweenTimeline {
  to(
    target: TweenTarget,
    vars: TweenVars,
    position?: TweenTimelinePosition,
  ): this;
  from(
    target: TweenTarget,
    vars: TweenVars,
    position?: TweenTimelinePosition,
  ): this;
  fromTo(
    target: TweenTarget,
    from: TweenChannelValues,
    to: TweenVars,
    position?: TweenTimelinePosition,
  ): this;
  kill(): void;
}

export interface ScriptTweenApi {
  to(vars: TweenVars): TweenHandle;
  to(target: TweenTarget, vars: TweenVars): TweenHandle;
  from(vars: TweenVars): TweenHandle;
  from(target: TweenTarget, vars: TweenVars): TweenHandle;
  fromTo(
    from: TweenChannelValues,
    to: TweenVars,
    options?: TweenPlaybackOptions,
  ): TweenHandle;
  fromTo(
    target: TweenTarget,
    from: TweenChannelValues,
    to: TweenVars,
    options?: TweenPlaybackOptions,
  ): TweenHandle;
  timeline(options?: ScriptTweenTimelineOptions): TweenTimeline;
  /** Stop every tween and timeline started from this context. */
  kill(): void;
}

export type TweenPlayMode = "to" | "from" | "fromTo";

/** One node play requested by `ctx.tween`. Built by the script façade, run by the runtime. */
export interface ScriptTweenStart {
  nodeId: string;
  mode: TweenPlayMode;
  from?: TweenChannelValues;
  to?: TweenChannelValues;
  duration: number;
  delay: number;
  ease: TweenEaseName;
  repeat: number;
  yoyo: boolean;
  repeatDelay: number;
  onStart?: () => void;
  onUpdate?: () => void;
  onComplete?: () => void;
  timelineId?: string;
  /** Seconds from the start of the timeline. */
  timelinePosition?: number;
}
