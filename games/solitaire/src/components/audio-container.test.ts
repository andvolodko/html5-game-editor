import { describe, expect, it, vi } from "vitest";
import { EventBus } from "@game-editor/runtime";
import { AudioContainerBehaviour } from "./audio-container.js";
import {
  createScriptContext,
  type ScriptCreateContext,
} from "@game-editor/game-components";

function createContext(
  properties: Record<string, unknown>,
  services: ScriptCreateContext["services"],
): ScriptCreateContext {
  return createScriptContext({
    nodeId: "node_audio",
    componentId: "comp_1",
    scriptId: "solitaire.AudioContainer",
    properties,
    services,
  });
}

describe("AudioContainerBehaviour", () => {
  it("sets a pointer cursor and hides hover children", () => {
    const setNodeCursor = vi.fn();
    const setNodeVisible = vi.fn();
    const behaviour = new AudioContainerBehaviour(
      createContext(
        {},
        {
          bus: new EventBus(),
          changeScene: () => undefined,
          listChildNodes: (nodeId) => {
            if (nodeId === "node_audio") {
              return [
                { id: "node_on", name: "on" },
                { id: "node_off", name: "off" },
              ];
            }
            if (nodeId === "node_on") {
              return [{ id: "node_on_hover", name: "Hover" }];
            }
            if (nodeId === "node_off") {
              return [{ id: "node_off_hover", name: "Hover" }];
            }
            return [];
          },
          setNodeCursor,
          setNodeVisible,
        },
      ),
    );
    behaviour.start();

    expect(setNodeVisible).toHaveBeenCalledWith("node_on_hover", false);
    expect(setNodeVisible).toHaveBeenCalledWith("node_off_hover", false);
    expect(setNodeCursor).toHaveBeenCalledWith("node_on", "pointer");
    expect(setNodeCursor).toHaveBeenCalledWith("node_on_hover", "pointer");
    expect(setNodeCursor).toHaveBeenCalledWith("node_off", "pointer");
    expect(setNodeCursor).toHaveBeenCalledWith("node_off_hover", "pointer");
  });

  it("enables audio on on-click and disables on off-click", () => {
    const setAudioEnabled = vi.fn();
    const handlers = new Map<string, () => void>();
    const behaviour = new AudioContainerBehaviour(
      createContext(
        {},
        {
          bus: new EventBus(),
          changeScene: () => undefined,
          listChildNodes: (nodeId) => {
            if (nodeId === "node_audio") {
              return [
                { id: "node_on", name: "on" },
                { id: "node_off", name: "off" },
              ];
            }
            return [];
          },
          setAudioEnabled,
          onNodePointerEvent: (nodeId, event, handler) => {
            handlers.set(`${nodeId}:${event}`, handler);
            return () => undefined;
          },
        },
      ),
    );
    behaviour.start();

    handlers.get("node_off:pointertap")?.();
    expect(setAudioEnabled).toHaveBeenCalledWith(false);

    handlers.get("node_on:pointertap")?.();
    expect(setAudioEnabled).toHaveBeenCalledWith(true);
  });

  it("toggles hover child visibility on pointerover and pointerout", () => {
    const setNodeVisible = vi.fn();
    const handlers = new Map<string, () => void>();
    const behaviour = new AudioContainerBehaviour(
      createContext(
        {},
        {
          bus: new EventBus(),
          changeScene: () => undefined,
          listChildNodes: (nodeId) => {
            if (nodeId === "node_audio") {
              return [{ id: "node_on", name: "on" }];
            }
            if (nodeId === "node_on") {
              return [{ id: "node_on_hover", name: "Hover" }];
            }
            return [];
          },
          setNodeVisible,
          onNodePointerEvent: (nodeId, event, handler) => {
            handlers.set(`${nodeId}:${event}`, handler);
            return () => undefined;
          },
        },
      ),
    );
    behaviour.start();

    setNodeVisible.mockClear();
    handlers.get("node_on:pointerover")?.();
    expect(setNodeVisible).toHaveBeenCalledWith("node_on_hover", true);

    setNodeVisible.mockClear();
    handlers.get("node_on:pointerout")?.();
    expect(setNodeVisible).toHaveBeenCalledWith("node_on_hover", false);
  });
});
