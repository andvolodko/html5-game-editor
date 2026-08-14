import { describe, expect, it, vi } from "vitest";
import { EventBus } from "@game-editor/core";
import { ButtonBehaviour } from "./button.js";
import type { ScriptCreateContext } from "../types.js";

function createContext(
  properties: Record<string, unknown>,
  services: ScriptCreateContext["services"],
): ScriptCreateContext {
  return {
    nodeId: "node_btn",
    componentId: "comp_1",
    scriptId: "shared.Button",
    properties,
    services,
  };
}

describe("ButtonBehaviour", () => {
  it("hides pressed, shows regular, and sets a pointer cursor", () => {
    const setNodeVisible = vi.fn();
    const setNodeCursor = vi.fn();
    new ButtonBehaviour(
      createContext(
        {},
        {
          bus: new EventBus(),
          changeScene: () => undefined,
          listChildNodes: () => [
            { id: "node_regular", name: "regular" },
            { id: "node_pressed", name: "pressed" },
            { id: "node_text", name: "Text" },
          ],
          setNodeVisible,
          setNodeCursor,
        },
      ),
    );

    expect(setNodeVisible).toHaveBeenCalledWith("node_regular", true);
    expect(setNodeVisible).toHaveBeenCalledWith("node_pressed", false);
    expect(setNodeCursor).toHaveBeenCalledWith("node_btn", "pointer");
    expect(setNodeCursor).toHaveBeenCalledWith("node_regular", "pointer");
    expect(setNodeCursor).toHaveBeenCalledWith("node_text", "pointer");
  });

  it("swaps regular/pressed on pointerdown and pointerup", () => {
    const setNodeVisible = vi.fn();
    const handlers = new Map<string, () => void>();
    new ButtonBehaviour(
      createContext(
        {},
        {
          bus: new EventBus(),
          changeScene: () => undefined,
          listChildNodes: () => [
            { id: "node_regular", name: "regular" },
            { id: "node_pressed", name: "pressed" },
          ],
          setNodeVisible,
          onNodePointerEvent: (nodeId, event, handler) => {
            handlers.set(`${nodeId}:${event}`, handler);
            return () => undefined;
          },
        },
      ),
    );

    setNodeVisible.mockClear();
    handlers.get("node_btn:pointerdown")?.();
    expect(setNodeVisible).toHaveBeenCalledWith("node_regular", false);
    expect(setNodeVisible).toHaveBeenCalledWith("node_pressed", true);

    setNodeVisible.mockClear();
    handlers.get("node_btn:pointerup")?.();
    expect(setNodeVisible).toHaveBeenCalledWith("node_regular", true);
    expect(setNodeVisible).toHaveBeenCalledWith("node_pressed", false);
  });
});
