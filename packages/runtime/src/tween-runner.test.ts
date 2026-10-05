import { describe, expect, it, vi } from "vitest";
import {
  TWEEN_INFINITE_REPEAT,
  type ScriptTweenStart,
  type TweenEaseName,
} from "@game-editor/game-components";
import {
  TweenRunner,
  type TweenPose,
  type TweenPoseSink,
} from "./tween-runner.js";

const NODE_A = "node_a";
const NODE_B = "node_b";
const LINEAR: TweenEaseName = "linear";

function identityPose(partial?: Partial<TweenPose>): TweenPose {
  return {
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    alpha: 1,
    ...partial,
  };
}

function createSink(initial: Record<string, Partial<TweenPose>>) {
  const poses = new Map<string, TweenPose>();
  for (const [id, partial] of Object.entries(initial)) {
    poses.set(id, identityPose(partial));
  }
  const sink: TweenPoseSink = {
    readPose(nodeId) {
      const pose = poses.get(nodeId);
      return pose ? { ...pose } : undefined;
    },
    writeTransform(nodeId, pose, channels) {
      const current = poses.get(nodeId);
      if (!current) {
        return;
      }
      if (channels.has("x")) current.x = pose.x;
      if (channels.has("y")) current.y = pose.y;
      if (channels.has("rotation")) current.rotation = pose.rotation;
      if (channels.has("scaleX")) current.scaleX = pose.scaleX;
      if (channels.has("scaleY")) current.scaleY = pose.scaleY;
    },
    writeAlpha(nodeId, alpha) {
      const current = poses.get(nodeId);
      if (current) {
        current.alpha = alpha;
      }
    },
  };
  return {
    sink,
    pose(nodeId: string): TweenPose {
      const pose = poses.get(nodeId);
      if (!pose) {
        throw new Error(`Missing pose ${nodeId}`);
      }
      return pose;
    },
  };
}

function request(
  partial: Partial<ScriptTweenStart> & Pick<ScriptTweenStart, "nodeId">,
): ScriptTweenStart {
  return {
    mode: "to",
    duration: 1,
    delay: 0,
    ease: LINEAR,
    repeat: 0,
    yoyo: false,
    repeatDelay: 0,
    ...partial,
  };
}

describe("TweenRunner", () => {
  it("resolves += values when the tween starts and eases linearly", () => {
    const world = createSink({ [NODE_A]: { x: 10 } });
    const runner = new TweenRunner(world.sink);
    runner.start(
      request({ nodeId: NODE_A, to: { x: "+=15" }, duration: 0.5 }),
    );

    runner.step(0.25);
    expect(world.pose(NODE_A).x).toBeCloseTo(17.5);

    runner.step(0.25);
    expect(world.pose(NODE_A).x).toBeCloseTo(25);
  });

  it("plays from the given value back to the captured pose", () => {
    const world = createSink({ [NODE_A]: { scaleX: 1, scaleY: 1 } });
    const runner = new TweenRunner(world.sink);
    runner.start(
      request({
        nodeId: NODE_A,
        mode: "from",
        from: { scale: 0 },
        duration: 0.5,
      }),
    );

    runner.step(0.05);
    expect(world.pose(NODE_A).scaleX).toBeCloseTo(0.1);
    expect(world.pose(NODE_A).scaleY).toBeCloseTo(0.1);

    runner.step(0.45);
    expect(world.pose(NODE_A).scaleX).toBeCloseTo(1);
  });

  it("keeps the turnaround pose when a frame steps past the duration", () => {
    const world = createSink({ [NODE_A]: { x: 0 } });
    const runner = new TweenRunner(world.sink);
    runner.start(
      request({
        nodeId: NODE_A,
        to: { x: 100 },
        duration: 0.4,
        yoyo: true,
        repeat: TWEEN_INFINITE_REPEAT,
      }),
    );

    runner.step(0.5);
    expect(world.pose(NODE_A).x).toBeCloseTo(75);

    runner.step(0.3);
    expect(world.pose(NODE_A).x).toBeCloseTo(0);
  });

  it("continues a non-yoyo repeat from the start without a wrapped sample", () => {
    const world = createSink({ [NODE_A]: { x: 0 } });
    const runner = new TweenRunner(world.sink);
    runner.start(
      request({
        nodeId: NODE_A,
        to: { x: 100 },
        duration: 0.4,
        repeat: TWEEN_INFINITE_REPEAT,
      }),
    );

    runner.step(0.5);
    expect(world.pose(NODE_A).x).toBeCloseTo(25);
  });

  it("yoyos a repeating tween", () => {
    const world = createSink({ [NODE_A]: { x: 0 } });
    const runner = new TweenRunner(world.sink);
    runner.start(
      request({
        nodeId: NODE_A,
        to: { x: 100 },
        duration: 0.4,
        yoyo: true,
        repeat: TWEEN_INFINITE_REPEAT,
      }),
    );

    runner.step(0.4);
    expect(world.pose(NODE_A).x).toBeCloseTo(100);
    runner.step(0.4);
    expect(world.pose(NODE_A).x).toBeCloseTo(0);
    runner.step(0.4);
    expect(world.pose(NODE_A).x).toBeCloseTo(100);
  });

  it("staggers the second target by its extra delay", () => {
    const world = createSink({
      [NODE_A]: { x: 0 },
      [NODE_B]: { x: 0 },
    });
    const runner = new TweenRunner(world.sink);
    runner.start(request({ nodeId: NODE_A, to: { x: 100 }, duration: 0.5 }));
    runner.start(
      request({
        nodeId: NODE_B,
        to: { x: 100 },
        duration: 0.5,
        delay: 0.5,
      }),
    );

    runner.step(0.5);
    expect(world.pose(NODE_A).x).toBeCloseTo(100);
    expect(world.pose(NODE_B).x).toBeCloseTo(0);

    runner.step(0.5);
    expect(world.pose(NODE_B).x).toBeCloseTo(100);
  });

  it("plays timeline children in sequence and repeats the sequence", () => {
    const world = createSink({ [NODE_A]: { x: 0 } });
    const runner = new TweenRunner(world.sink);
    const timelineId = runner.createTimeline({ repeat: TWEEN_INFINITE_REPEAT });
    runner.start(
      request({
        nodeId: NODE_A,
        to: { x: "+=50" },
        duration: 0.5,
        timelineId,
        timelinePosition: 0,
      }),
    );
    runner.start(
      request({
        nodeId: NODE_A,
        to: { y: 20 },
        duration: 0.5,
        timelineId,
        timelinePosition: 0.5,
      }),
    );

    runner.step(0.5);
    expect(world.pose(NODE_A).x).toBeCloseTo(50);
    expect(world.pose(NODE_A).y).toBeCloseTo(0);

    runner.step(0.5);
    expect(world.pose(NODE_A).y).toBeCloseTo(20);

    runner.step(0.5);
    expect(world.pose(NODE_A).x).toBeCloseTo(100);
  });

  it("uses power2.out instead of a linear midpoint", () => {
    const world = createSink({ [NODE_A]: { x: 0 } });
    const runner = new TweenRunner(world.sink);
    runner.start(
      request({
        nodeId: NODE_A,
        to: { x: 100 },
        duration: 1,
        ease: "power2.out",
      }),
    );
    runner.step(0.5);
    expect(world.pose(NODE_A).x).toBeGreaterThan(70);
    expect(world.pose(NODE_A).x).toBeLessThan(100);
  });

  it("replaces an older tween on the same channel", () => {
    const world = createSink({ [NODE_A]: { x: 0 } });
    const runner = new TweenRunner(world.sink);
    runner.start(request({ nodeId: NODE_A, to: { x: 100 }, duration: 1 }));
    runner.step(0.5);
    expect(world.pose(NODE_A).x).toBeCloseTo(50);

    runner.start(
      request({ nodeId: NODE_A, to: { x: 0 }, duration: 0.5 }),
    );
    runner.step(0.5);
    expect(world.pose(NODE_A).x).toBeCloseTo(0);
  });

  it("stops a tween without moving it further", () => {
    const world = createSink({ [NODE_A]: { x: 0 } });
    const runner = new TweenRunner(world.sink);
    const id = runner.start(
      request({ nodeId: NODE_A, to: { x: 100 }, duration: 1 }),
    );
    runner.step(0.25);
    expect(world.pose(NODE_A).x).toBeCloseTo(25);
    runner.stop(id);
    runner.step(1);
    expect(world.pose(NODE_A).x).toBeCloseTo(25);
  });

  it("isolates a throwing onComplete", () => {
    const world = createSink({ [NODE_A]: { x: 0 } });
    const runner = new TweenRunner(world.sink);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    runner.start(
      request({
        nodeId: NODE_A,
        to: { x: 10 },
        duration: 0.1,
        onComplete: () => {
          throw new Error("callback failed");
        },
      }),
    );
    expect(() => runner.step(0.1)).not.toThrow();
    expect(world.pose(NODE_A).x).toBeCloseTo(10);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
