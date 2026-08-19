import { describe, expect, it, vi } from "vitest";
import { EventBus } from "@game-editor/core";
import { AudioClickBehaviour } from "./audio-click.js";
import { createScriptContext } from "../script-context.js";
import type { ScriptCreateContext } from "../types.js";

function createContext(
  properties: Record<string, unknown>,
  services: ScriptCreateContext["services"],
): ScriptCreateContext {
  return createScriptContext({
    nodeId: "node_btn",
    componentId: "comp_1",
    scriptId: "shared.AudioClick",
    properties,
    services,
  });
}

describe("AudioClickBehaviour", () => {
  it("plays audio on the selected pointer event", () => {
    const playAudio = vi.fn();
    const unsubscribers: Array<() => void> = [];
    let handler: (() => void) | undefined;

    const behaviour = new AudioClickBehaviour(
      createContext(
        { audioAssetId: "asset_sfx", mouseEvent: "pointerdown" },
        {
          bus: new EventBus(),
          changeScene: () => undefined,
          playAudio,
          onNodePointerEvent: (_nodeId, event, next) => {
            expect(event).toBe("pointerdown");
            handler = next;
            const off = () => undefined;
            unsubscribers.push(off);
            return off;
          },
        },
      ),
    );
    behaviour.start();

    handler?.();
    expect(playAudio).toHaveBeenCalledWith("asset_sfx");

    behaviour.destroy();
  });

  it("falls back to onNodeClick for pointertap when pointer API is missing", () => {
    const playAudio = vi.fn();
    let handler: (() => void) | undefined;

    const behaviour = new AudioClickBehaviour(
      createContext(
        { audioAssetId: "asset_sfx", mouseEvent: "pointertap" },
        {
          bus: new EventBus(),
          changeScene: () => undefined,
          playAudio,
          onNodeClick: (_nodeId, next) => {
            handler = next;
            return () => undefined;
          },
        },
      ),
    );
    behaviour.start();

    handler?.();
    expect(playAudio).toHaveBeenCalledWith("asset_sfx");
    behaviour.destroy();
  });

  it("does not play when audioAssetId is empty", () => {
    const playAudio = vi.fn();
    let handler: (() => void) | undefined;

    const behaviour = new AudioClickBehaviour(
      createContext(
        { audioAssetId: "", mouseEvent: "pointertap" },
        {
          bus: new EventBus(),
          changeScene: () => undefined,
          playAudio,
          onNodePointerEvent: (_nodeId, _event, next) => {
            handler = next;
            return () => undefined;
          },
        },
      ),
    );
    behaviour.start();

    handler?.();
    expect(playAudio).not.toHaveBeenCalled();
    behaviour.destroy();
  });
});
