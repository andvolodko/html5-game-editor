import { describe, expect, it, vi } from "vitest";
import { EventBus } from "@game-editor/core";
import { createScriptAnimationsApi } from "./script-animations-api.js";
import type { ScriptRuntimeServices } from "./types.js";

function services(
  partial: Partial<ScriptRuntimeServices> = {},
): ScriptRuntimeServices {
  return {
    bus: new EventBus(),
    changeScene: () => undefined,
    ...partial,
  };
}

describe("createScriptAnimationsApi", () => {
  it("list() delegates to the current node", () => {
    const listModel3DAnimations = vi.fn((nodeId: string) =>
      nodeId === "node_a" ? ["Idle", "Walk"] : [],
    );
    const api = createScriptAnimationsApi(
      "node_a",
      services({ listModel3DAnimations }),
    );

    expect(api.list()).toEqual(["Idle", "Walk"]);
    expect(api.names()).toEqual(["Idle", "Walk"]);
    expect(listModel3DAnimations).toHaveBeenCalledWith("node_a");
  });

  it("play() targets the current node and defaults loop to true", () => {
    const setModel3DPlayback = vi.fn();
    const api = createScriptAnimationsApi(
      "node_a",
      services({ setModel3DPlayback }),
    );

    api.play("Walk");
    expect(setModel3DPlayback).toHaveBeenCalledWith("node_a", {
      animation: "Walk",
      loop: true,
      playing: true,
    });
  });

  it("play() forwards the loop option and preserves timeScale", () => {
    const setModel3DPlayback = vi.fn();
    const api = createScriptAnimationsApi(
      "node_a",
      services({
        setModel3DPlayback,
        getModel3DPlayback: () => ({
          animation: "Idle",
          loop: true,
          timeScale: 1.5,
          playing: true,
        }),
      }),
    );

    api.play("Attack", { loop: false });
    expect(setModel3DPlayback).toHaveBeenCalledWith("node_a", {
      animation: "Attack",
      loop: false,
      playing: true,
      timeScale: 1.5,
    });
  });

  it("stop() halts playback without changing loop", () => {
    const setModel3DPlayback = vi.fn();
    const api = createScriptAnimationsApi(
      "node_a",
      services({
        setModel3DPlayback,
        getModel3DPlayback: () => ({
          animation: "Walk",
          loop: true,
          timeScale: 0.5,
          playing: true,
        }),
      }),
    );

    api.stop();
    expect(setModel3DPlayback).toHaveBeenCalledWith("node_a", {
      playing: false,
      timeScale: 0.5,
    });
  });

  it("freeze() halts playback and disables looping", () => {
    const setModel3DPlayback = vi.fn();
    const api = createScriptAnimationsApi(
      "node_a",
      services({
        setModel3DPlayback,
        getModel3DPlayback: () => ({
          animation: "Die",
          loop: false,
          timeScale: 1,
          playing: true,
        }),
      }),
    );

    api.freeze();
    expect(setModel3DPlayback).toHaveBeenCalledWith("node_a", {
      loop: false,
      playing: false,
      timeScale: 1,
    });
  });

  it("isPlaying() uses the current clip and playing flag", () => {
    const api = createScriptAnimationsApi(
      "node_a",
      services({
        getModel3DPlayback: () => ({
          animation: "Walk",
          loop: true,
          timeScale: 1,
          playing: true,
        }),
      }),
    );
    expect(api.isPlaying()).toBe(true);
    expect(api.isPlaying("Walk")).toBe(true);
    expect(api.isPlaying("Idle")).toBe(false);
  });

  it("duration() returns wall-clock seconds using timeScale", () => {
    const api = createScriptAnimationsApi(
      "node_a",
      services({
        getModel3DAnimationDuration: (_nodeId, clip) =>
          clip === "Attack" ? 4 : undefined,
        getModel3DPlayback: () => ({
          animation: "Attack",
          loop: false,
          timeScale: 2,
          playing: true,
        }),
      }),
    );

    expect(api.duration("Attack")).toBe(2);
  });

  it("duration() uses a fallback when the clip length is unavailable", () => {
    const api = createScriptAnimationsApi("node_a", services());
    expect(api.duration("Missing")).toBe(2);
  });

  it("missing animation runtime capability does not crash", () => {
    const api = createScriptAnimationsApi("node_a", services());

    expect(api.list()).toEqual([]);
    expect(api.duration("Idle")).toBe(2);
    expect(() => {
      api.play("Idle", { loop: true });
      api.stop();
      api.freeze();
    }).not.toThrow();
  });
});
