import { describe, expect, it, vi } from "vitest";
import { EventBus } from "./event-bus.js";

describe("EventBus", () => {
  it("delivers events to subscribers and supports unsubscribe", () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const off = bus.on("game.start", handler);

    bus.emit("game.start", { ok: true });
    expect(handler).toHaveBeenCalledWith({ ok: true });

    off();
    bus.emit("game.start", { ok: false });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("clear removes all handlers", () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on("a", handler);
    bus.clear();
    bus.emit("a");
    expect(handler).not.toHaveBeenCalled();
  });
});
