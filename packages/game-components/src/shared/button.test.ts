import { describe, expect, it, vi } from "vitest";
import { EventBus } from "@game-editor/core";
import { ButtonBehaviour } from "./button.js";
import { createScriptContext } from "../script-context.js";
import type { ScriptCreateContext } from "../types.js";

function createContext(
  properties: Record<string, unknown>,
  services: ScriptCreateContext["services"],
): ScriptCreateContext {
  return createScriptContext({
    nodeId: "node_btn",
    componentId: "comp_1",
    scriptId: "shared.Button",
    properties,
    services,
  });
}

describe("ButtonBehaviour", () => {
  it("hides pressed, shows regular, and sets a pointer cursor", () => {
    const setNodeVisible = vi.fn();
    const setNodeCursor = vi.fn();
    const behaviour = new ButtonBehaviour(
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
    behaviour.start();

    expect(setNodeVisible).toHaveBeenCalledWith("node_regular", true);
    expect(setNodeVisible).toHaveBeenCalledWith("node_pressed", false);
    expect(
      setNodeVisible.mock.calls.some((call) => call[0] === "node_text"),
    ).toBe(false);
    expect(setNodeCursor).toHaveBeenCalledWith("node_btn", "pointer");
    expect(setNodeCursor).toHaveBeenCalledWith("node_regular", "pointer");
    expect(setNodeCursor).toHaveBeenCalledWith("node_text", "pointer");
  });

  it("uses the host HitZone as the pointer target when present", () => {
    const setNodeCursor = vi.fn();
    const handlers = new Map<string, () => void>();
    const setNodeVisible = vi.fn();
    const behaviour = new ButtonBehaviour(
      createContext(
        {},
        {
          bus: new EventBus(),
          changeScene: () => undefined,
          listChildNodes: () => [
            { id: "node_regular", name: "regular" },
            { id: "node_pressed", name: "pressed" },
          ],
          hasHitZone: (nodeId) => nodeId === "node_btn",
          setNodeVisible,
          setNodeCursor,
          onNodePointerEvent: (nodeId, event, handler) => {
            handlers.set(`${nodeId}:${event}`, handler);
            return () => undefined;
          },
        },
      ),
    );
    behaviour.start();

    expect(setNodeCursor).toHaveBeenCalledWith("node_btn", "pointer");
    expect(setNodeCursor).not.toHaveBeenCalledWith("node_regular", "pointer");
    expect(setNodeCursor).not.toHaveBeenCalledWith("node_pressed", "pointer");

    setNodeVisible.mockClear();
    handlers.get("node_btn:pointerdown")?.();
    expect(setNodeVisible).toHaveBeenCalledWith("node_regular", false);
    expect(setNodeVisible).toHaveBeenCalledWith("node_pressed", true);
  });

  it("swaps optional text-regular/text-pressed when those children exist", () => {
    const setNodeVisible = vi.fn();
    const handlers = new Map<string, () => void>();
    const behaviour = new ButtonBehaviour(
      createContext(
        {},
        {
          bus: new EventBus(),
          changeScene: () => undefined,
          listChildNodes: () => [
            { id: "node_regular", name: "regular" },
            { id: "node_pressed", name: "pressed" },
            { id: "node_text_regular", name: "text-regular" },
            { id: "node_text_pressed", name: "text-pressed" },
          ],
          setNodeVisible,
          onNodePointerEvent: (nodeId, event, handler) => {
            handlers.set(`${nodeId}:${event}`, handler);
            return () => undefined;
          },
        },
      ),
    );
    behaviour.start();

    expect(setNodeVisible).toHaveBeenCalledWith("node_text_regular", true);
    expect(setNodeVisible).toHaveBeenCalledWith("node_text_pressed", false);

    setNodeVisible.mockClear();
    handlers.get("node_btn:pointerdown")?.();
    expect(setNodeVisible).toHaveBeenCalledWith("node_text_regular", false);
    expect(setNodeVisible).toHaveBeenCalledWith("node_text_pressed", true);

    setNodeVisible.mockClear();
    handlers.get("node_btn:pointerup")?.();
    expect(setNodeVisible).toHaveBeenCalledWith("node_text_regular", true);
    expect(setNodeVisible).toHaveBeenCalledWith("node_text_pressed", false);
  });

  it("toggles only the text children that are present", () => {
    const setNodeVisible = vi.fn();
    const behaviour = new ButtonBehaviour(
      createContext(
        {},
        {
          bus: new EventBus(),
          changeScene: () => undefined,
          listChildNodes: () => [
            { id: "node_regular", name: "regular" },
            { id: "node_pressed", name: "pressed" },
            { id: "node_text_regular", name: "text-regular" },
          ],
          setNodeVisible,
        },
      ),
    );
    behaviour.start();

    expect(setNodeVisible).toHaveBeenCalledWith("node_text_regular", true);
    expect(
      setNodeVisible.mock.calls.some((call) => call[0] === "node_text_pressed"),
    ).toBe(false);
  });

  it("swaps regular/pressed on pointerdown and pointerup", () => {
    const setNodeVisible = vi.fn();
    const handlers = new Map<string, () => void>();
    const behaviour = new ButtonBehaviour(
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
    behaviour.start();

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
