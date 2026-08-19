import { afterEach, describe, expect, it, vi } from "vitest";
import { EventBus } from "@game-editor/core";
import { createScriptContext, type ScriptCreateContext } from "@game-editor/game-components";
import { LoadingSceneBehaviour } from "./loading-scene.js";

function createContext(
  properties: Record<string, unknown>,
  services: Pick<ScriptCreateContext["services"], "bus" | "changeScene">,
): ScriptCreateContext {
  return createScriptContext({
    nodeId: "node_loading",
    componentId: "comp_loading",
    scriptId: "editor-features-demo.LoadingScene",
    properties,
    services: {
      bus: services.bus,
      changeScene: services.changeScene,
    },
  });
}

describe("LoadingSceneBehaviour", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not change scene until completeEvent and minDisplayMs", async () => {
    vi.useFakeTimers();
    const bus = new EventBus();
    const changeScene = vi.fn();
    const behaviour = new LoadingSceneBehaviour(
      createContext({ minDisplayMs: 500 }, { bus, changeScene }),
    );
    behaviour.start();

    await vi.advanceTimersByTimeAsync(500);
    expect(changeScene).not.toHaveBeenCalled();

    bus.emit("loading.complete");
    expect(changeScene).toHaveBeenCalledTimes(1);
    expect(changeScene).toHaveBeenCalledWith("main");
    behaviour.destroy();
  });

  it("waits for the remaining min time after preload completes early", async () => {
    vi.useFakeTimers();
    const bus = new EventBus();
    const changeScene = vi.fn();
    const behaviour = new LoadingSceneBehaviour(
      createContext({ minDisplayMs: 400, nextScene: "hybrid" }, { bus, changeScene }),
    );
    behaviour.start();
    bus.emit("loading.complete");
    expect(changeScene).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(399);
    expect(changeScene).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(changeScene).toHaveBeenCalledWith("hybrid");
    behaviour.destroy();
  });

  it("does not navigate after destroy", async () => {
    vi.useFakeTimers();
    const bus = new EventBus();
    const changeScene = vi.fn();
    const behaviour = new LoadingSceneBehaviour(
      createContext({ minDisplayMs: 200 }, { bus, changeScene }),
    );
    behaviour.start();
    behaviour.destroy();
    bus.emit("loading.complete");
    await vi.advanceTimersByTimeAsync(200);
    expect(changeScene).not.toHaveBeenCalled();
  });
});
