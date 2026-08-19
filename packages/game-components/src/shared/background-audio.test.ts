import { describe, expect, it, vi } from "vitest";
import { EventBus } from "@game-editor/core";
import { BackgroundAudioBehaviour } from "./background-audio.js";
import { createScriptContext } from "../script-context.js";
import type { ScriptCreateContext } from "../types.js";

function createContext(
  properties: Record<string, unknown>,
  services: ScriptCreateContext["services"],
): ScriptCreateContext {
  return createScriptContext({
    nodeId: "node_audio",
    componentId: "comp_1",
    scriptId: "shared.BackgroundAudio",
    properties,
    services,
  });
}

describe("BackgroundAudioBehaviour", () => {
  it("plays looping audio at the given volume", () => {
    const playAudio = vi.fn();
    const stopAudio = vi.fn();
    const behaviour = new BackgroundAudioBehaviour(
      createContext(
        { audioAssetId: "asset_bgm", volume: 0.4 },
        {
          bus: new EventBus(),
          changeScene: () => undefined,
          playAudio,
          stopAudio,
        },
      ),
    );
    behaviour.start();

    expect(playAudio).toHaveBeenCalledWith("asset_bgm", {
      loop: true,
      volume: 0.4,
    });
    behaviour.destroy();
    expect(stopAudio).toHaveBeenCalledWith("asset_bgm");
  });

  it("does not play when audioAssetId is empty", () => {
    const playAudio = vi.fn();
    const stopAudio = vi.fn();
    const behaviour = new BackgroundAudioBehaviour(
      createContext(
        { audioAssetId: "", volume: 1 },
        {
          bus: new EventBus(),
          changeScene: () => undefined,
          playAudio,
          stopAudio,
        },
      ),
    );
    behaviour.start();

    expect(playAudio).not.toHaveBeenCalled();
    behaviour.destroy();
    expect(stopAudio).not.toHaveBeenCalled();
  });

  it("clamps volume to 0–1", () => {
    const playAudio = vi.fn();
    const behaviour = new BackgroundAudioBehaviour(
      createContext(
        { audioAssetId: "asset_bgm", volume: 2.5 },
        {
          bus: new EventBus(),
          changeScene: () => undefined,
          playAudio,
        },
      ),
    );
    behaviour.start();

    expect(playAudio).toHaveBeenCalledWith("asset_bgm", {
      loop: true,
      volume: 1,
    });
    behaviour.destroy();
  });
});
