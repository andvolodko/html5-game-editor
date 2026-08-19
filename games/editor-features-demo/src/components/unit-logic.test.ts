import { describe, expect, it, vi } from "vitest";
import { EventBus } from "@game-editor/core";
import {
  createDetachedRuntimeTransform2D,
  createScriptContext,
  type ScriptCreateContext,
} from "@game-editor/game-components";
import { UnitLogicBehaviour } from "./unit-logic.js";

const NODE_ID = "node_unit";

function createContext(
  properties: Record<string, unknown>,
  setAnimatedSpritePlayback = vi.fn(),
): ScriptCreateContext {
  return createScriptContext({
    nodeId: NODE_ID,
    componentId: "comp_unit",
    scriptId: "editor-features-demo.UnitLogic",
    properties,
    services: {
      bus: new EventBus(),
      changeScene: () => undefined,
      setAnimatedSpritePlayback,
    },
    transform: createDetachedRuntimeTransform2D({ x: 500, y: 500 }),
  });
}

describe("UnitLogicBehaviour", () => {
  it("starts in idle and plays the idle clip", () => {
    const setAnimatedSpritePlayback = vi.fn();
    const unit = new UnitLogicBehaviour(
      createContext(
        { idleAnim: "Idle Knife", idleMinSeconds: 2, idleMaxSeconds: 2 },
        setAnimatedSpritePlayback,
      ),
    );

    unit.start();

    expect(setAnimatedSpritePlayback).toHaveBeenCalledWith(NODE_ID, {
      animation: "Idle Knife",
      loop: true,
      playing: true,
    });
  });

  it("switches to run after idle and moves toward a viewport target", () => {
    const setAnimatedSpritePlayback = vi.fn();
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    const ctx = createContext(
      {
        idleAnim: "Idle",
        runAnim: "Run ",
        attackAnim: "Shoot",
        idleMinSeconds: 0,
        idleMaxSeconds: 0,
        runMinSeconds: 10,
        runMaxSeconds: 10,
        speed: 100,
        minX: 0,
        maxX: 1000,
        minY: 0,
        maxY: 1000,
      },
      setAnimatedSpritePlayback,
    );
    const unit = new UnitLogicBehaviour(ctx);
    unit.start();
    unit.update(0.01);

    expect(setAnimatedSpritePlayback).toHaveBeenLastCalledWith(NODE_ID, {
      animation: "Run ",
      loop: true,
      playing: true,
    });

    unit.update(1);
    expect(ctx.transform.x).toBeLessThan(500);
    expect(ctx.transform.y).toBeLessThan(500);
    expect(ctx.transform.scaleX).toBe(-1);
    random.mockRestore();
  });

  it("does not move while attacking", () => {
    const setAnimatedSpritePlayback = vi.fn();
    const random = vi.spyOn(Math, "random").mockReturnValue(0.99);
    const ctx = createContext(
      {
        idleAnim: "Idle",
        attackAnim: "Shoot",
        idleMinSeconds: 0,
        idleMaxSeconds: 0,
        attackMinSeconds: 10,
        attackMaxSeconds: 10,
        speed: 200,
      },
      setAnimatedSpritePlayback,
    );
    const unit = new UnitLogicBehaviour(ctx);
    unit.start();
    unit.update(0.01);
    expect(setAnimatedSpritePlayback).toHaveBeenLastCalledWith(NODE_ID, {
      animation: "Shoot",
      loop: true,
      playing: true,
    });
    unit.update(1);
    expect(ctx.transform.x).toBe(500);
    expect(ctx.transform.y).toBe(500);
    random.mockRestore();
  });

  it("applies live clip name changes on the existing instance", () => {
    const setAnimatedSpritePlayback = vi.fn();
    const unit = new UnitLogicBehaviour(
      createContext(
        { idleAnim: "Idle", idleMinSeconds: 10, idleMaxSeconds: 10 },
        setAnimatedSpritePlayback,
      ),
    );
    unit.start();
    unit.onPropertiesChanged({
      idleAnim: "Idle Knife",
      idleMinSeconds: 10,
      idleMaxSeconds: 10,
    });
    expect(setAnimatedSpritePlayback).toHaveBeenLastCalledWith(NODE_ID, {
      animation: "Idle Knife",
      loop: true,
      playing: true,
    });
  });
});
