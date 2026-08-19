import { describe, expect, it, vi } from "vitest";
import { EventBus } from "@game-editor/core";
import {
  createDetachedRuntimeTransform2D,
  createScriptContext,
  seededUnitFloat,
  type ScriptCreateContext,
} from "@game-editor/game-components";
import { CloudBehaviour } from "./cloud.js";

const FULL_TURN = Math.PI * 2;
const VERTICAL_FREQUENCY_RATIO = 0.73;
const PHASE_SALT_X = 17;
const PHASE_SALT_Y = 41;
const NODE_ID = "node-a";

function createContext(
  properties: Record<string, unknown>,
  setTransform2D = vi.fn(),
): ScriptCreateContext {
  return createScriptContext({
    nodeId: NODE_ID,
    componentId: "comp_cloud",
    scriptId: "editor-features-demo.Cloud",
    properties,
    services: {
      bus: new EventBus(),
      changeScene: () => undefined,
      setTransform2D,
    },
    transform: createDetachedRuntimeTransform2D({ x: 10, y: 20 }),
  });
}

function expectedX(
  elapsed: number,
  angularSpeed: number,
  rangeX: number,
  startX: number,
): number {
  const angle = elapsed * angularSpeed;
  const phaseX = seededUnitFloat(NODE_ID, PHASE_SALT_X) * FULL_TURN;
  return startX + Math.sin(angle + phaseX) * rangeX;
}

function expectedY(
  elapsed: number,
  angularSpeed: number,
  rangeY: number,
  startY: number,
): number {
  const angle = elapsed * angularSpeed;
  const phaseY = seededUnitFloat(NODE_ID, PHASE_SALT_Y) * FULL_TURN;
  return (
    startY +
    Math.sin(angle * VERTICAL_FREQUENCY_RATIO + phaseY) * rangeY
  );
}

describe("CloudBehaviour", () => {
  it("uses the start pose as rest position and animates x/y without setTransform2D", () => {
    const setTransform2D = vi.fn();
    const ctx = createContext({}, setTransform2D);
    const cloud = new CloudBehaviour(ctx);

    expect(ctx.transform.x).toBe(10);
    expect(ctx.transform.y).toBe(20);

    cloud.start();
    expect(ctx.transform.x).toBe(10);
    expect(ctx.transform.y).toBe(20);

    cloud.update(1);
    expect(ctx.transform.x).toBeCloseTo(expectedX(1, 0.18 * FULL_TURN, 28, 10));
    expect(ctx.transform.y).toBeCloseTo(expectedY(1, 0.18 * FULL_TURN, 14, 20));
    expect(setTransform2D).not.toHaveBeenCalled();
  });

  it("applies live speed and amplitude changes on the existing instance", () => {
    const setTransform2D = vi.fn();
    const ctx = createContext(
      { speed: 0.18, rangeX: 28, rangeY: 14 },
      setTransform2D,
    );
    const cloud = new CloudBehaviour(ctx);
    cloud.start();
    cloud.update(1);

    cloud.onPropertiesChanged({ speed: 0.5, rangeX: 40, rangeY: 8 });
    cloud.update(1);

    expect(ctx.transform.x).toBeCloseTo(expectedX(2, 0.5 * FULL_TURN, 40, 10));
    expect(ctx.transform.y).toBeCloseTo(expectedY(2, 0.5 * FULL_TURN, 8, 20));
    expect(setTransform2D).not.toHaveBeenCalled();

    cloud.onPropertiesChanged({ speed: 0.5, rangeX: 0, rangeY: 0 });
    cloud.update(1);
    expect(ctx.transform.x).toBe(10);
    expect(ctx.transform.y).toBe(20);
  });
});
