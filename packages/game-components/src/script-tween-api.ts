import {
  DEFAULT_TWEEN_DURATION_SECONDS,
  DEFAULT_TWEEN_EASE,
  TWEEN_INFINITE_REPEAT,
  isTweenEaseName,
  type ScriptTweenApi,
  type ScriptTweenStart,
  type ScriptTweenTimelineOptions,
  type TweenChannelValues,
  type TweenEaseName,
  type TweenHandle,
  type TweenPlaybackOptions,
  type TweenPlayMode,
  type TweenTarget,
  type TweenTimeline,
  type TweenTimelinePosition,
  type TweenVars,
} from "./tween-types.js";
import type { ScriptRuntimeServices } from "./types.js";

const RELATIVE_ADD_PREFIX = "+=";
const RELATIVE_SUB_PREFIX = "-=";
const NOOP_HANDLE: TweenHandle = { id: "", kill() {} };

interface NormalizedPlayback {
  duration: number;
  delay: number;
  ease: TweenEaseName;
  repeat: number;
  yoyo: boolean;
  repeatDelay: number;
  stagger: number;
  onStart?: () => void;
  onUpdate?: () => void;
  onComplete?: () => void;
}

function isTweenTarget(value: TweenTarget | TweenVars): value is TweenTarget {
  return typeof value === "string" || Array.isArray(value);
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeRepeat(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return value === TWEEN_INFINITE_REPEAT ? TWEEN_INFINITE_REPEAT : 0;
  }
  return Math.floor(value);
}

function normalizePlayback(
  vars: TweenPlaybackOptions | undefined,
): NormalizedPlayback {
  const ease =
    vars?.ease !== undefined && isTweenEaseName(vars.ease)
      ? vars.ease
      : DEFAULT_TWEEN_EASE;
  return {
    duration: Math.max(
      0,
      finiteNumber(vars?.duration, DEFAULT_TWEEN_DURATION_SECONDS),
    ),
    delay: Math.max(0, finiteNumber(vars?.delay, 0)),
    ease,
    repeat: normalizeRepeat(vars?.repeat),
    yoyo: vars?.yoyo === true,
    repeatDelay: Math.max(0, finiteNumber(vars?.repeatDelay, 0)),
    stagger: Math.max(0, finiteNumber(vars?.stagger, 0)),
    onStart: vars?.onStart,
    onUpdate: vars?.onUpdate,
    onComplete: vars?.onComplete,
  };
}

function channelValues(vars: TweenChannelValues | undefined): TweenChannelValues {
  if (!vars) {
    return {};
  }
  const picked: TweenChannelValues = {};
  if (vars.x !== undefined) picked.x = vars.x;
  if (vars.y !== undefined) picked.y = vars.y;
  if (vars.rotation !== undefined) picked.rotation = vars.rotation;
  if (vars.scaleX !== undefined) picked.scaleX = vars.scaleX;
  if (vars.scaleY !== undefined) picked.scaleY = vars.scaleY;
  if (vars.scale !== undefined) picked.scale = vars.scale;
  if (vars.alpha !== undefined) picked.alpha = vars.alpha;
  return picked;
}

function targetIds(target: TweenTarget): string[] {
  const ids = typeof target === "string" ? [target] : [...target];
  return ids.filter((id) => id.length > 0);
}

function resolvePosition(
  cursor: number,
  position: TweenTimelinePosition | undefined,
): number {
  if (position === undefined) {
    return cursor;
  }
  if (typeof position === "number" && Number.isFinite(position)) {
    return position;
  }
  if (typeof position !== "string") {
    return cursor;
  }
  const trimmed = position.trim();
  if (trimmed.startsWith(RELATIVE_ADD_PREFIX)) {
    const delta = Number(trimmed.slice(RELATIVE_ADD_PREFIX.length));
    return Number.isFinite(delta) ? cursor + delta : cursor;
  }
  if (trimmed.startsWith(RELATIVE_SUB_PREFIX)) {
    const delta = Number(trimmed.slice(RELATIVE_SUB_PREFIX.length));
    return Number.isFinite(delta) ? cursor - delta : cursor;
  }
  const absolute = Number(trimmed);
  return Number.isFinite(absolute) ? absolute : cursor;
}

class TweenHandleGroup implements TweenHandle {
  constructor(
    readonly id: string,
    private readonly ids: readonly string[],
    private readonly stop: (tweenId: string) => void,
  ) {}

  kill(): void {
    for (const tweenId of this.ids) {
      this.stop(tweenId);
    }
  }
}

class HostTweenTimeline implements TweenTimeline {
  private cursor = 0;

  constructor(
    private readonly id: string,
    private readonly services: ScriptRuntimeServices,
    private readonly track: (tweenId: string) => void,
  ) {}

  to(
    target: TweenTarget,
    vars: TweenVars,
    position?: TweenTimelinePosition,
  ): this {
    this.append("to", target, undefined, vars, position);
    return this;
  }

  from(
    target: TweenTarget,
    vars: TweenVars,
    position?: TweenTimelinePosition,
  ): this {
    this.append("from", target, channelValues(vars), undefined, position, vars);
    return this;
  }

  fromTo(
    target: TweenTarget,
    from: TweenChannelValues,
    to: TweenVars,
    position?: TweenTimelinePosition,
  ): this {
    this.append("fromTo", target, channelValues(from), to, position);
    return this;
  }

  kill(): void {
    this.services.stopTweenTimeline?.(this.id);
  }

  private append(
    mode: TweenPlayMode,
    target: TweenTarget,
    from: TweenChannelValues | undefined,
    to: TweenVars | undefined,
    position: TweenTimelinePosition | undefined,
    playbackSource?: TweenPlaybackOptions,
  ): void {
    const playback = normalizePlayback(playbackSource ?? to);
    const start = resolvePosition(this.cursor, position);
    const ids = targetIds(target);
    ids.forEach((nodeId, index) => {
      const tweenId = this.services.startTween?.({
        nodeId,
        mode,
        from,
        to: mode === "from" ? undefined : channelValues(to),
        duration: playback.duration,
        delay: playback.delay,
        ease: playback.ease,
        repeat: playback.repeat,
        yoyo: playback.yoyo,
        repeatDelay: playback.repeatDelay,
        onStart: playback.onStart,
        onUpdate: playback.onUpdate,
        onComplete: playback.onComplete,
        timelineId: this.id,
        timelinePosition: start + index * playback.stagger,
      });
      if (tweenId) {
        this.track(tweenId);
      }
    });
    if (ids.length === 0) {
      return;
    }
    const lastStart = start + (ids.length - 1) * playback.stagger;
    const end = lastStart + playback.delay + playback.duration;
    this.cursor = Math.max(this.cursor, end);
  }
}

class HostScriptTweenApi implements ScriptTweenApi {
  private readonly tweenIds: string[] = [];
  private readonly timelineIds: string[] = [];

  constructor(
    private readonly nodeId: string,
    private readonly services: ScriptRuntimeServices,
  ) {}

  to(vars: TweenVars): TweenHandle;
  to(target: TweenTarget, vars: TweenVars): TweenHandle;
  to(varsOrTarget: TweenVars | TweenTarget, vars?: TweenVars): TweenHandle {
    if (isTweenTarget(varsOrTarget)) {
      return this.play("to", varsOrTarget, undefined, vars);
    }
    return this.play("to", this.nodeId, undefined, varsOrTarget);
  }

  from(vars: TweenVars): TweenHandle;
  from(target: TweenTarget, vars: TweenVars): TweenHandle;
  from(varsOrTarget: TweenVars | TweenTarget, vars?: TweenVars): TweenHandle {
    if (isTweenTarget(varsOrTarget)) {
      return this.play("from", varsOrTarget, channelValues(vars), undefined, vars);
    }
    return this.play("from", this.nodeId, channelValues(varsOrTarget), undefined, varsOrTarget);
  }

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
  fromTo(
    fromOrTarget: TweenChannelValues | TweenTarget,
    toOrFrom: TweenVars | TweenChannelValues,
    optionsOrTo?: TweenPlaybackOptions | TweenVars,
    options?: TweenPlaybackOptions,
  ): TweenHandle {
    if (isTweenTarget(fromOrTarget)) {
      return this.play(
        "fromTo",
        fromOrTarget,
        channelValues(toOrFrom),
        optionsOrTo as TweenVars | undefined,
        options,
      );
    }
    return this.play(
      "fromTo",
      this.nodeId,
      channelValues(fromOrTarget),
      toOrFrom,
      optionsOrTo,
    );
  }

  timeline(options?: ScriptTweenTimelineOptions): TweenTimeline {
    const timelineId = this.services.createTweenTimeline?.({
      repeat: normalizeRepeat(options?.repeat),
      yoyo: options?.yoyo === true,
      delay: Math.max(0, finiteNumber(options?.delay, 0)),
    });
    if (!timelineId) {
      return new HostTweenTimeline("", this.services, () => undefined);
    }
    this.timelineIds.push(timelineId);
    return new HostTweenTimeline(timelineId, this.services, (tweenId) => {
      this.tweenIds.push(tweenId);
    });
  }

  kill(): void {
    for (const timelineId of this.timelineIds) {
      this.services.stopTweenTimeline?.(timelineId);
    }
    for (const tweenId of this.tweenIds) {
      this.services.stopTween?.(tweenId);
    }
    this.timelineIds.length = 0;
    this.tweenIds.length = 0;
  }

  private play(
    mode: TweenPlayMode,
    target: TweenTarget,
    from: TweenChannelValues | undefined,
    to: TweenChannelValues | undefined,
    playbackSource?: TweenPlaybackOptions,
  ): TweenHandle {
    const playback = normalizePlayback({
      ...(to ?? {}),
      ...(playbackSource ?? {}),
    });
    const ids = targetIds(target);
    const started: string[] = [];
    ids.forEach((nodeId, index) => {
      const request: ScriptTweenStart = {
        nodeId,
        mode,
        from,
        to: mode === "from" ? undefined : channelValues(to),
        duration: playback.duration,
        delay: playback.delay + index * playback.stagger,
        ease: playback.ease,
        repeat: playback.repeat,
        yoyo: playback.yoyo,
        repeatDelay: playback.repeatDelay,
        onStart: playback.onStart,
        onUpdate: playback.onUpdate,
        onComplete: playback.onComplete,
      };
      const tweenId = this.services.startTween?.(request);
      if (tweenId) {
        started.push(tweenId);
        this.tweenIds.push(tweenId);
      }
    });
    const first = started[0];
    if (!first) {
      return NOOP_HANDLE;
    }
    return new TweenHandleGroup(first, started, (tweenId) => {
      this.services.stopTween?.(tweenId);
    });
  }
}

export function createScriptTweenApi(
  nodeId: string,
  services: ScriptRuntimeServices,
): ScriptTweenApi {
  return new HostScriptTweenApi(nodeId, services);
}
