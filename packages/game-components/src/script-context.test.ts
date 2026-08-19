import { describe, expect, it, vi } from "vitest";
import { EventBus } from "@game-editor/core";
import { createDetachedRuntimeTransform2D } from "@game-editor/scene";
import { createScriptContext } from "./script-context.js";

describe("createScriptContext", () => {
  it("binds transform3D and animations to the given nodeId", () => {
    const setTransform3D = vi.fn();
    const setModel3DPlayback = vi.fn();
    const listModel3DAnimations = vi.fn(() => ["Idle"]);
    const live = createDetachedRuntimeTransform2D({ x: 4, y: 8 });
    const ctx = createScriptContext({
      nodeId: "node_host",
      componentId: "comp_1",
      scriptId: "test.Mover",
      properties: { speed: 1 },
      services: {
        bus: new EventBus(),
        changeScene: () => undefined,
        setTransform3D,
        setModel3DPlayback,
        listModel3DAnimations,
      },
      transform: live,
    });

    expect(ctx.transform).toBe(live);
    expect(ctx.services.setTransform3D).toBe(setTransform3D);
    expect(ctx.animations.list()).toEqual(["Idle"]);
    expect(listModel3DAnimations).toHaveBeenCalledWith("node_host");

    ctx.transform3D.setPosition({ x: 1, y: 2, z: 3 });
    expect(setTransform3D).toHaveBeenCalledWith("node_host", {
      position: { x: 1, y: 2, z: 3 },
    });

    ctx.animations.play("Idle", { loop: true });
    expect(setModel3DPlayback).toHaveBeenCalledWith("node_host", {
      animation: "Idle",
      loop: true,
      playing: true,
    });
  });
});
