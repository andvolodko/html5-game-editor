import { describe, expect, it, vi } from "vitest";
import { EventBus } from "@game-editor/core";
import { createScriptTransformApi } from "./script-transform-api.js";
import type {
  ScriptRuntimeServices,
  ScriptTransform3D,
} from "./types.js";

function services(
  partial: Partial<ScriptRuntimeServices> = {},
): ScriptRuntimeServices {
  return {
    bus: new EventBus(),
    changeScene: () => undefined,
    ...partial,
  };
}

const POSE_A: ScriptTransform3D = {
  position: { x: 1, y: 2, z: 3 },
  rotation: { x: 0.1, y: 0.2, z: 0.3 },
  scale: { x: 2, y: 3, z: 4 },
};

const POSE_B: ScriptTransform3D = {
  position: { x: 9, y: 8, z: 7 },
  rotation: { x: 1, y: 2, z: 3 },
  scale: { x: 0.5, y: 0.5, z: 0.5 },
};

describe("createScriptTransformApi", () => {
  it("position getter delegates to the current runtime transform", () => {
    let pose = POSE_A;
    const api = createScriptTransformApi(
      "node_a",
      services({ getTransform3D: () => pose }),
    );

    expect(api.position.x).toBe(1);
    expect(api.position.y).toBe(2);
    expect(api.position.z).toBe(3);
    expect({ ...api.position }).toEqual({ x: 1, y: 2, z: 3 });
    pose = POSE_B;
    expect(api.position.x).toBe(9);
    expect(api.position.y).toBe(8);
    expect(api.position.z).toBe(7);
  });

  it("rotation getter delegates to the current runtime transform", () => {
    let pose = POSE_A;
    const api = createScriptTransformApi(
      "node_a",
      services({ getTransform3D: () => pose }),
    );

    expect(api.rotation.x).toBe(0.1);
    expect(api.rotation.y).toBe(0.2);
    expect(api.rotation.z).toBe(0.3);
    expect({ ...api.rotation }).toEqual({ x: 0.1, y: 0.2, z: 0.3 });
    pose = POSE_B;
    expect(api.rotation.x).toBe(1);
    expect(api.rotation.y).toBe(2);
    expect(api.rotation.z).toBe(3);
  });

  it("scale getter delegates to the current runtime transform", () => {
    let pose = POSE_A;
    const api = createScriptTransformApi(
      "node_a",
      services({ getTransform3D: () => pose }),
    );

    expect(api.scale.x).toBe(2);
    expect(api.scale.y).toBe(3);
    expect(api.scale.z).toBe(4);
    expect({ ...api.scale }).toEqual({ x: 2, y: 3, z: 4 });
    pose = POSE_B;
    expect(api.scale.x).toBe(0.5);
    expect(api.scale.y).toBe(0.5);
    expect(api.scale.z).toBe(0.5);
  });

  it("axis assignment writes through without replacing the facade", () => {
    const setTransform3D = vi.fn();
    const pose: ScriptTransform3D = {
      position: { x: 1, y: 2, z: 3 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    };
    const api = createScriptTransformApi(
      "node_a",
      services({
        getTransform3D: () => pose,
        setTransform3D,
      }),
    );
    const position = api.position;
    api.position.z = 10;
    expect(position).toBe(api.position);
    expect(setTransform3D).toHaveBeenCalledWith("node_a", {
      position: { x: 1, y: 2, z: 10 },
    });
  });

  it("setPosition delegates with the current nodeId", () => {
    const setTransform3D = vi.fn();
    const api = createScriptTransformApi(
      "node_a",
      services({ setTransform3D }),
    );

    api.setPosition({ x: 1, y: 0, z: 2 });
    expect(setTransform3D).toHaveBeenCalledWith("node_a", {
      position: { x: 1, y: 0, z: 2 },
    });
  });

  it("setRotation delegates with the current nodeId", () => {
    const setTransform3D = vi.fn();
    const api = createScriptTransformApi(
      "node_a",
      services({ setTransform3D }),
    );

    api.setRotation({ x: 0, y: 1.5, z: 0 });
    expect(setTransform3D).toHaveBeenCalledWith("node_a", {
      rotation: { x: 0, y: 1.5, z: 0 },
    });
  });

  it("setScale delegates with the current nodeId", () => {
    const setTransform3D = vi.fn();
    const api = createScriptTransformApi(
      "node_a",
      services({ setTransform3D }),
    );

    api.setScale({ x: 2, y: 2, z: 2 });
    expect(setTransform3D).toHaveBeenCalledWith("node_a", {
      scale: { x: 2, y: 2, z: 2 },
    });
  });

  it("set() supports partial updates", () => {
    const setTransform3D = vi.fn();
    const api = createScriptTransformApi(
      "node_a",
      services({ setTransform3D }),
    );

    api.set({ position: { x: 4, y: 5, z: 6 } });
    expect(setTransform3D).toHaveBeenCalledWith("node_a", {
      position: { x: 4, y: 5, z: 6 },
    });

    api.set({
      rotation: { x: 0, y: 0, z: 1 },
      scale: { x: 1, y: 1, z: 1 },
    });
    expect(setTransform3D).toHaveBeenCalledWith("node_a", {
      rotation: { x: 0, y: 0, z: 1 },
      scale: { x: 1, y: 1, z: 1 },
    });
  });

  it("missing optional runtime service does not crash", () => {
    const api = createScriptTransformApi("node_a", services());

    expect(api.position.x).toBe(0);
    expect(api.position.y).toBe(0);
    expect(api.position.z).toBe(0);
    expect(api.rotation.x).toBe(0);
    expect(api.rotation.y).toBe(0);
    expect(api.rotation.z).toBe(0);
    expect(api.scale.x).toBe(1);
    expect(api.scale.y).toBe(1);
    expect(api.scale.z).toBe(1);
    expect(() => {
      api.setPosition({ x: 1, y: 2, z: 3 });
      api.setRotation({ x: 0, y: 0, z: 0 });
      api.setScale({ x: 1, y: 1, z: 1 });
      api.set({ position: { x: 0, y: 0, z: 0 } });
    }).not.toThrow();
  });
});
