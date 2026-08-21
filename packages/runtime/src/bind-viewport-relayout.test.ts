import { describe, expect, it, vi } from "vitest";
import {
  bindViewportRelayout,
  VIEWPORT_RELAYOUT_DELAYS_MS,
} from "./bind-viewport-relayout.js";

describe("bindViewportRelayout", () => {
  it("relayouts immediately and after settle delays on orientationchange", () => {
    const listeners = new Map<string, () => void>();
    const timeouts = new Map<number, () => void>();
    let nextTimeoutId = 1;
    const view = {
      addEventListener(type: string, listener: () => void) {
        listeners.set(type, listener);
      },
      removeEventListener(type: string) {
        listeners.delete(type);
      },
      setTimeout(handler: () => void, _delayMs: number) {
        const id = nextTimeoutId;
        nextTimeoutId += 1;
        timeouts.set(id, handler);
        return id;
      },
      clearTimeout(id: number) {
        timeouts.delete(id);
      },
      visualViewport: {
        addEventListener(type: string, listener: () => void) {
          listeners.set(`visual:${type}`, listener);
        },
        removeEventListener(type: string) {
          listeners.delete(`visual:${type}`);
        },
      },
    };
    const layout = vi.fn();
    const dispose = bindViewportRelayout(layout, view);

    listeners.get("orientationchange")?.();
    expect(layout).toHaveBeenCalledTimes(1);

    const delayed = VIEWPORT_RELAYOUT_DELAYS_MS.filter((delay) => delay > 0);
    expect(timeouts.size).toBe(delayed.length);
    for (const handler of timeouts.values()) {
      handler();
    }
    expect(layout).toHaveBeenCalledTimes(1 + delayed.length);

    dispose();
    expect(listeners.size).toBe(0);
  });

  it("relayouts on visualViewport resize", () => {
    const listeners = new Map<string, () => void>();
    const view = {
      addEventListener(type: string, listener: () => void) {
        listeners.set(type, listener);
      },
      removeEventListener(type: string) {
        listeners.delete(type);
      },
      setTimeout() {
        return 1;
      },
      clearTimeout() {},
      visualViewport: {
        addEventListener(type: string, listener: () => void) {
          listeners.set(`visual:${type}`, listener);
        },
        removeEventListener(type: string) {
          listeners.delete(`visual:${type}`);
        },
      },
    };
    const layout = vi.fn();
    bindViewportRelayout(layout, view);
    listeners.get("visual:resize")?.();
    expect(layout).toHaveBeenCalled();
  });
});
