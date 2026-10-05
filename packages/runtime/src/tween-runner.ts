import {
  NODE_ALPHA_MAX,
  NODE_ALPHA_MIN,
} from "@game-editor/scene";
import { createId } from "@game-editor/shared";
import {
  TWEEN_INFINITE_REPEAT,
  type ScriptTweenStart,
  type ScriptTweenTimelineOptions,
  type TweenChannel,
  type TweenChannelValues,
  type TweenEaseName,
  type TweenPlayMode,
} from "@game-editor/game-components";
import { Group, Tween } from "@tweenjs/tween.js";
import { tweenEasing } from "./tween-ease.js";
import {
  resolveTweenChannels,
  resolveTweenValue,
} from "./tween-values.js";

const MS_PER_SECOND = 1000;
/** Ignore sub-millisecond gaps so a leg that ends on this frame does not wait an extra frame. */
const NEXT_LEG_START_SLACK_MS = 0.001;

export interface TweenPose {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  alpha: number;
}

export interface TweenPoseSink {
  readPose(nodeId: string): TweenPose | undefined;
  writeTransform(
    nodeId: string,
    pose: TweenPose,
    channels: ReadonlySet<TweenChannel>,
  ): void;
  writeAlpha(nodeId: string, alpha: number): void;
}

type TweenBag = Record<string, number>;

interface TimelineChild {
  id: string;
  nodeId: string;
  mode: TweenPlayMode;
  from?: TweenChannelValues;
  to?: TweenChannelValues;
  channels: ReadonlySet<TweenChannel>;
  positionMs: number;
  delayMs: number;
  durationMs: number;
  ease: TweenEaseName;
  repeat: number;
  yoyo: boolean;
  repeatDelayMs: number;
  onStart?: () => void;
  onUpdate?: () => void;
  onComplete?: () => void;
  resolvedFrom?: TweenBag;
  resolvedTo?: TweenBag;
}

interface TimelineState {
  id: string;
  repeat: number;
  repeatsRemaining: number;
  yoyo: boolean;
  direction: 1 | -1;
  initialDelayMs: number;
  originMs: number;
  durationMs: number;
  cyclesStarted: number;
  children: TimelineChild[];
  done: boolean;
}

interface TweenJob {
  id: string;
  nodeId: string;
  channels: ReadonlySet<TweenChannel>;
  timelineId?: string;
  child?: TimelineChild;
  playDirection: 1 | -1;
  delayMs: number;
  durationMs: number;
  ease: TweenEaseName;
  repeat: number;
  yoyo: boolean;
  repeatDelayMs: number;
  mode: TweenPlayMode;
  from?: TweenChannelValues;
  to?: TweenChannelValues;
  onStart?: () => void;
  onUpdate?: () => void;
  onComplete?: () => void;
  /** Extra legs after the one currently playing. Infinite when the API repeat is -1. */
  repeatsLeft: number;
  /** Waiting out repeatDelay before the next leg. Endpoints are already chosen. */
  awaitingRepeat: boolean;
  legFrom?: TweenBag;
  legTo?: TweenBag;
  cancelled: boolean;
  tween?: Tween<TweenBag>;
}

function secondsToMs(seconds: number): number {
  return Math.max(0, seconds) * MS_PER_SECOND;
}

function clampAlpha(alpha: number): number {
  return Math.min(NODE_ALPHA_MAX, Math.max(NODE_ALPHA_MIN, alpha));
}

function invokeTweenCallback(
  hook: "onStart" | "onUpdate" | "onComplete",
  fn: (() => void) | undefined,
): void {
  if (!fn) {
    return;
  }
  try {
    fn();
  } catch (error) {
    console.error(`[TweenRunner] ${hook} failed`, error);
  }
}

function bagToValues(bag: TweenBag | undefined): TweenChannelValues {
  const values: TweenChannelValues = {};
  if (!bag) {
    return values;
  }
  if (bag.x !== undefined) values.x = bag.x;
  if (bag.y !== undefined) values.y = bag.y;
  if (bag.rotation !== undefined) values.rotation = bag.rotation;
  if (bag.scaleX !== undefined) values.scaleX = bag.scaleX;
  if (bag.scaleY !== undefined) values.scaleY = bag.scaleY;
  if (bag.alpha !== undefined) values.alpha = bag.alpha;
  return values;
}

/**
 * Per-runtime tween clock. tween.js interpolates a plain bag; this class
 * copies that bag onto scene transforms and alpha.
 */
export class TweenRunner {
  private readonly group = new Group();
  private readonly pending: TweenJob[] = [];
  private readonly active = new Map<string, TweenJob>();
  private readonly timelines = new Map<string, TimelineState>();
  private readonly alphaCache = new Map<string, number>();
  private elapsedMs = 0;
  /** Timestamp passed to the group update that is currently running. */
  private updateTimeMs = 0;

  constructor(private readonly sink: TweenPoseSink) {}

  start(request: ScriptTweenStart): string {
    if (request.timelineId) {
      return this.addTimelineChild(request);
    }
    const mapped = resolveTweenChannels(request.mode, request.from, request.to);
    if (mapped.channels.size === 0) {
      return "";
    }
    const job = this.createJob(request, mapped.channels, createId("tween"));
    this.overwrite(job);
    this.pending.push(job);
    return job.id;
  }

  stop(tweenId: string): void {
    if (tweenId.length === 0) {
      return;
    }
    for (const timeline of this.timelines.values()) {
      timeline.children = timeline.children.filter((child) => child.id !== tweenId);
    }
    for (const job of [...this.pending, ...this.active.values()]) {
      if (job.id === tweenId || job.child?.id === tweenId) {
        this.halt(job);
      }
    }
  }

  createTimeline(options: ScriptTweenTimelineOptions): string {
    const id = createId("tl");
    const repeat =
      options.repeat === undefined || options.repeat < 0
        ? TWEEN_INFINITE_REPEAT
        : Math.floor(options.repeat);
    this.timelines.set(id, {
      id,
      repeat: options.repeat === undefined ? 0 : repeat,
      repeatsRemaining: options.repeat === undefined ? 0 : repeat,
      yoyo: options.yoyo === true,
      direction: 1,
      initialDelayMs: secondsToMs(options.delay ?? 0),
      originMs: this.elapsedMs,
      durationMs: 0,
      cyclesStarted: 0,
      children: [],
      done: false,
    });
    return id;
  }

  stopTimeline(timelineId: string): void {
    const timeline = this.timelines.get(timelineId);
    if (!timeline) {
      return;
    }
    timeline.done = true;
    for (const job of [...this.pending, ...this.active.values()]) {
      if (job.timelineId === timelineId) {
        this.halt(job);
      }
    }
    this.timelines.delete(timelineId);
  }

  step(dtSeconds: number): void {
    const dtMs = secondsToMs(dtSeconds);
    if (dtMs <= 0) {
      return;
    }
    const frameStart = this.elapsedMs;
    this.elapsedMs += dtMs;
    const queued = this.pending.splice(0, this.pending.length);
    const ready: Array<{ job: TweenJob; armAt: number }> = [];
    for (const job of queued) {
      if (job.cancelled) {
        continue;
      }
      if (job.delayMs > dtMs) {
        job.delayMs -= dtMs;
        this.pending.push(job);
        continue;
      }
      ready.push({ job, armAt: frameStart + job.delayMs });
    }
    ready.sort((left, right) => left.armAt - right.armAt);
    let cursor = frameStart;
    for (const item of ready) {
      if (item.job.cancelled) {
        continue;
      }
      if (item.armAt > cursor) {
        this.updateGroup(item.armAt);
        cursor = item.armAt;
      }
      this.armReady(item.job, item.armAt);
    }
    if (this.elapsedMs > cursor && this.group.getAll().length > 0) {
      this.updateGroup(this.elapsedMs);
    }
    this.advanceTimelines();
  }

  clear(): void {
    for (const job of [...this.pending, ...this.active.values()]) {
      this.halt(job);
    }
    this.pending.length = 0;
    this.active.clear();
    this.timelines.clear();
    this.alphaCache.clear();
    this.group.removeAll();
    this.elapsedMs = 0;
  }

  private addTimelineChild(request: ScriptTweenStart): string {
    const timeline = request.timelineId
      ? this.timelines.get(request.timelineId)
      : undefined;
    if (!timeline || timeline.done) {
      return "";
    }
    const mapped = resolveTweenChannels(request.mode, request.from, request.to);
    if (mapped.channels.size === 0) {
      return "";
    }
    const positionMs = secondsToMs(request.timelinePosition ?? 0);
    const delayMs = secondsToMs(request.delay);
    const durationMs = secondsToMs(request.duration);
    const child: TimelineChild = {
      id: createId("tween"),
      nodeId: request.nodeId,
      mode: request.mode,
      from: request.from,
      to: request.to,
      channels: mapped.channels,
      positionMs,
      delayMs,
      durationMs,
      ease: request.ease,
      repeat: request.repeat,
      yoyo: request.yoyo,
      repeatDelayMs: secondsToMs(request.repeatDelay),
      onStart: request.onStart,
      onUpdate: request.onUpdate,
      onComplete: request.onComplete,
    };
    timeline.children.push(child);
    timeline.durationMs = Math.max(
      timeline.durationMs,
      positionMs + delayMs + durationMs,
    );
    this.scheduleChild(timeline, child);
    return child.id;
  }

  private scheduleChild(timeline: TimelineState, child: TimelineChild): void {
    if (timeline.done) {
      return;
    }
    const forwardStart = child.positionMs + child.delayMs;
    const forwardEnd = forwardStart + child.durationMs;
    const motionStart =
      timeline.direction === -1
        ? timeline.durationMs - forwardEnd
        : forwardStart;
    const initial =
      timeline.cyclesStarted === 0 ? timeline.initialDelayMs : 0;
    const already = this.elapsedMs - timeline.originMs;
    const reverse =
      timeline.direction === -1 &&
      child.resolvedFrom !== undefined &&
      child.resolvedTo !== undefined;
    const job = this.createJob(
      {
        nodeId: child.nodeId,
        mode: reverse ? "fromTo" : child.mode,
        from: reverse ? bagToValues(child.resolvedTo) : child.from,
        to: reverse ? bagToValues(child.resolvedFrom) : child.to,
        duration: child.durationMs / MS_PER_SECOND,
        delay: 0,
        ease: child.ease,
        repeat: child.repeat,
        yoyo: child.yoyo,
        repeatDelay: child.repeatDelayMs / MS_PER_SECOND,
        onStart: child.onStart,
        onUpdate: child.onUpdate,
        onComplete: child.onComplete,
      },
      child.channels,
      createId("tween"),
    );
    job.timelineId = timeline.id;
    job.child = child;
    job.playDirection = timeline.direction;
    job.delayMs = Math.max(0, initial + motionStart - already);
    job.durationMs = child.durationMs;
    this.overwrite(job);
    if (!job.cancelled) {
      this.pending.push(job);
    }
  }

  private createJob(
    request: ScriptTweenStart,
    channels: ReadonlySet<TweenChannel>,
    id: string,
  ): TweenJob {
    return {
      id,
      nodeId: request.nodeId,
      channels,
      playDirection: 1,
      delayMs: secondsToMs(request.delay),
      durationMs: secondsToMs(request.duration),
      ease: request.ease,
      repeat: request.repeat,
      yoyo: request.yoyo,
      repeatDelayMs: secondsToMs(request.repeatDelay),
      mode: request.mode,
      from: request.from,
      to: request.to,
      onStart: request.onStart,
      onUpdate: request.onUpdate,
      onComplete: request.onComplete,
      repeatsLeft: request.repeat < 0 ? Number.POSITIVE_INFINITY : request.repeat,
      awaitingRepeat: false,
      cancelled: false,
    };
  }

  private updateGroup(timeMs: number): void {
    this.updateTimeMs = timeMs;
    this.group.update(timeMs);
  }

  private armReady(job: TweenJob, armAtMs: number): void {
    if (job.awaitingRepeat && job.legFrom && job.legTo) {
      const from = job.legFrom;
      const to = job.legTo;
      job.awaitingRepeat = false;
      this.playLeg(job, from, to, armAtMs, false);
      return;
    }
    this.arm(job, armAtMs);
  }

  private advanceTimelines(): void {
    for (const timeline of this.timelines.values()) {
      if (timeline.done || timeline.durationMs <= 0) {
        continue;
      }
      const elapsed = this.elapsedMs - timeline.originMs;
      const limit =
        timeline.durationMs +
        (timeline.cyclesStarted === 0 ? timeline.initialDelayMs : 0);
      if (elapsed >= limit) {
        this.finishCycle(timeline);
      }
    }
  }

  private finishCycle(timeline: TimelineState): void {
    for (const job of [...this.pending, ...this.active.values()]) {
      if (job.timelineId === timeline.id) {
        this.halt(job);
      }
    }
    if (timeline.repeat !== TWEEN_INFINITE_REPEAT) {
      if (timeline.repeatsRemaining <= 0) {
        timeline.done = true;
        return;
      }
      timeline.repeatsRemaining -= 1;
    }
    if (timeline.yoyo) {
      timeline.direction = timeline.direction === 1 ? -1 : 1;
    }
    timeline.cyclesStarted += 1;
    timeline.originMs = this.elapsedMs;
    for (const child of timeline.children) {
      this.scheduleChild(timeline, child);
    }
  }

  private arm(job: TweenJob, armAtMs: number): void {
    if (job.cancelled) {
      return;
    }
    const pose = this.readPose(job.nodeId);
    if (!pose) {
      return;
    }
    const mapped = resolveTweenChannels(job.mode, job.from, job.to);
    const bag: TweenBag = {};
    const end: TweenBag = {};
    for (const channel of job.channels) {
      const current = pose[channel];
      if (job.mode === "to") {
        const target = mapped.to.get(channel);
        bag[channel] = current;
        end[channel] =
          target === undefined ? current : resolveTweenValue(current, target);
      } else if (job.mode === "from") {
        const source = mapped.from.get(channel);
        bag[channel] =
          source === undefined ? current : resolveTweenValue(current, source);
        end[channel] = current;
      } else {
        const source = mapped.from.get(channel);
        const target = mapped.to.get(channel);
        const fromValue =
          source === undefined ? current : resolveTweenValue(current, source);
        bag[channel] = fromValue;
        end[channel] =
          target === undefined
            ? fromValue
            : resolveTweenValue(fromValue, target);
      }
    }
    if (job.child && job.playDirection !== -1) {
      job.child.resolvedFrom = { ...bag };
      job.child.resolvedTo = { ...end };
    }
    if (job.durationMs <= 0) {
      this.publish(job, end);
      invokeTweenCallback("onStart", job.onStart);
      invokeTweenCallback("onComplete", job.onComplete);
      return;
    }
    this.playLeg(job, bag, end, armAtMs, true);
  }

  /**
   * One straight leg. Repeat and yoyo are started here, not inside tween.js:
   * when a frame steps past the duration, tween.js first writes the next
   * cycle's start pose and only then rewinds, so the sprite flashes for a frame.
   */
  private playLeg(
    job: TweenJob,
    from: TweenBag,
    to: TweenBag,
    startMs: number,
    notifyStart: boolean,
  ): void {
    const bag: TweenBag = { ...from };
    const end: TweenBag = { ...to };
    job.legFrom = { ...from };
    job.legTo = { ...to };
    job.awaitingRepeat = false;
    this.publish(job, bag);
    if (notifyStart) {
      invokeTweenCallback("onStart", job.onStart);
    }
    const tween = new Tween(bag);
    tween.to(end, job.durationMs);
    tween.easing(tweenEasing(job.ease));
    tween.onUpdate(() => {
      this.publish(job, bag);
      invokeTweenCallback("onUpdate", job.onUpdate);
    });
    tween.onComplete(() => {
      this.publish(job, end);
      this.active.delete(job.id);
      tween.remove();
      job.tween = undefined;
      if (job.cancelled) {
        return;
      }
      if (this.scheduleNextLeg(job, startMs)) {
        return;
      }
      invokeTweenCallback("onComplete", job.onComplete);
    });
    this.group.add(tween);
    tween.start(startMs);
    job.tween = tween;
    this.active.set(job.id, job);
  }

  /** @returns true when another leg was started or scheduled. */
  private scheduleNextLeg(job: TweenJob, legStartMs: number): boolean {
    if (job.repeatsLeft === 0 || !job.legFrom || !job.legTo) {
      return false;
    }
    if (Number.isFinite(job.repeatsLeft)) {
      job.repeatsLeft -= 1;
    }
    const nextFrom = job.yoyo ? { ...job.legTo } : { ...job.legFrom };
    const nextTo = job.yoyo ? { ...job.legFrom } : { ...job.legTo };
    const nextStartMs = legStartMs + job.durationMs + job.repeatDelayMs;
    if (this.updateTimeMs + NEXT_LEG_START_SLACK_MS < nextStartMs) {
      job.legFrom = nextFrom;
      job.legTo = nextTo;
      job.delayMs = nextStartMs - this.updateTimeMs;
      job.awaitingRepeat = true;
      this.pending.push(job);
      return true;
    }
    this.playLeg(job, nextFrom, nextTo, nextStartMs, false);
    return true;
  }

  private publish(job: TweenJob, bag: TweenBag): void {
    const pose = this.readPose(job.nodeId);
    if (!pose) {
      return;
    }
    let wroteTransform = false;
    const next: TweenPose = { ...pose };
    for (const channel of job.channels) {
      const value = bag[channel];
      if (value === undefined || !Number.isFinite(value)) {
        continue;
      }
      if (channel === "alpha") {
        const alpha = clampAlpha(value);
        bag[channel] = alpha;
        next.alpha = alpha;
        this.alphaCache.set(job.nodeId, alpha);
        this.sink.writeAlpha(job.nodeId, alpha);
        continue;
      }
      next[channel] = value;
      wroteTransform = true;
    }
    if (wroteTransform) {
      this.sink.writeTransform(job.nodeId, next, job.channels);
    }
  }

  private readPose(nodeId: string): TweenPose | undefined {
    const live = this.sink.readPose(nodeId);
    if (!live) {
      return undefined;
    }
    const alpha = this.alphaCache.get(nodeId);
    return alpha === undefined ? live : { ...live, alpha };
  }

  private conflicts(job: TweenJob, other: TweenJob): boolean {
    if (other.cancelled || job === other || job.nodeId !== other.nodeId) {
      return false;
    }
    if (
      job.timelineId !== undefined &&
      job.timelineId === other.timelineId
    ) {
      return false;
    }
    for (const channel of job.channels) {
      if (other.channels.has(channel)) {
        return true;
      }
    }
    return false;
  }

  private overwrite(job: TweenJob): void {
    const victims: TweenJob[] = [];
    for (const other of this.pending) {
      if (this.conflicts(job, other)) {
        victims.push(other);
      }
    }
    for (const other of this.active.values()) {
      if (this.conflicts(job, other)) {
        victims.push(other);
      }
    }
    for (const other of victims) {
      this.detachChild(other);
      this.halt(other);
    }
  }

  private detachChild(job: TweenJob): void {
    if (!job.child || !job.timelineId) {
      return;
    }
    const timeline = this.timelines.get(job.timelineId);
    if (!timeline) {
      return;
    }
    timeline.children = timeline.children.filter((child) => child !== job.child);
  }

  private halt(job: TweenJob): void {
    job.cancelled = true;
    this.active.delete(job.id);
    const tween = job.tween;
    job.tween = undefined;
    if (!tween) {
      return;
    }
    tween.stop();
    tween.remove();
  }
}
