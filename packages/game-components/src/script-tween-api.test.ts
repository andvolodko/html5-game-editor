import { describe, expect, it, vi } from "vitest";
import { EventBus } from "@game-editor/core";
import type { ScriptTweenStart } from "./tween-types.js";
import { createScriptContext } from "./script-context.js";

describe("ctx.tween", () => {
  it("targets the host node, staggers lists, and places timeline children", () => {
    const started: ScriptTweenStart[] = [];
    const startTween = vi.fn((request: ScriptTweenStart) => {
      started.push(request);
      return `tween_${started.length}`;
    });
    const stopTween = vi.fn();
    const createTweenTimeline = vi.fn(() => "tl_1");
    const stopTweenTimeline = vi.fn();
    const ctx = createScriptContext({
      nodeId: "node_host",
      componentId: "comp_1",
      scriptId: "test.Tween",
      properties: {},
      services: {
        bus: new EventBus(),
        changeScene: () => undefined,
        startTween,
        stopTween,
        createTweenTimeline,
        stopTweenTimeline,
      },
    });

    ctx.tween.to({ x: "+=10", duration: 0.4, ease: "power2.out" });
    expect(started[0]).toMatchObject({
      nodeId: "node_host",
      mode: "to",
      to: { x: "+=10" },
      duration: 0.4,
      ease: "power2.out",
    });

    ctx.tween.to(["node_a", "node_b"], {
      y: "-=80",
      stagger: 0.1,
      delay: 0.2,
    });
    expect(started[1]).toMatchObject({ nodeId: "node_a", to: { y: "-=80" } });
    expect(started[1]?.delay).toBeCloseTo(0.2);
    expect(started[2]).toMatchObject({ nodeId: "node_b", to: { y: "-=80" } });
    expect(started[2]?.delay).toBeCloseTo(0.3);

    const timeline = ctx.tween.timeline({ repeat: -1 });
    expect(createTweenTimeline).toHaveBeenCalledWith({
      repeat: -1,
      yoyo: false,
      delay: 0,
    });
    timeline
      .to("node_a", { x: 40, duration: 0.4 })
      .to("node_a", { rotation: 180, duration: 0.2 }, "-=0.1");
    expect(started[3]).toMatchObject({
      timelineId: "tl_1",
      to: { x: 40 },
    });
    expect(started[3]?.timelinePosition).toBe(0);
    expect(started[4]).toMatchObject({
      timelineId: "tl_1",
      to: { rotation: 180 },
    });
    expect(started[4]?.timelinePosition).toBeCloseTo(0.3);

    ctx.tween.kill();
    expect(stopTweenTimeline).toHaveBeenCalledWith("tl_1");
    expect(stopTween).toHaveBeenCalled();
  });

  it("sends from and fromTo as distinct modes", () => {
    const startTween = vi.fn(() => "tween_1");
    const ctx = createScriptContext({
      nodeId: "node_host",
      componentId: "comp_1",
      scriptId: "test.Tween",
      properties: {},
      services: {
        bus: new EventBus(),
        changeScene: () => undefined,
        startTween,
      },
    });

    ctx.tween.from({ scale: 0, duration: 0.6, ease: "back.out" });
    expect(startTween).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "from",
        from: { scale: 0 },
        duration: 0.6,
        ease: "back.out",
      }),
    );

    ctx.tween.fromTo({ alpha: 0 }, { alpha: 1, duration: 0.3 });
    expect(startTween).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: "fromTo",
        from: { alpha: 0 },
        to: { alpha: 1 },
        duration: 0.3,
      }),
    );
  });
});
