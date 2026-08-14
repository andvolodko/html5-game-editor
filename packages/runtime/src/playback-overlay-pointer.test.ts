import { describe, expect, it, vi } from "vitest";
import { bindPlaybackOverlayPointer } from "./playback-overlay-pointer.js";

function createHost(): {
  host: HTMLElement;
  emit: (type: string, init?: { clientX?: number; clientY?: number }) => void;
} {
  const listeners = new Map<string, EventListener>();
  const host = {
    style: { cursor: "" },
    addEventListener(type: string, listener: EventListener) {
      listeners.set(type, listener);
    },
    removeEventListener(type: string) {
      listeners.delete(type);
    },
  } as unknown as HTMLElement;
  return {
    host,
    emit(type, init) {
      const listener = listeners.get(type);
      listener?.(
        {
          clientX: init?.clientX ?? 0,
          clientY: init?.clientY ?? 0,
        } as PointerEvent,
      );
    },
  };
}

describe("bindPlaybackOverlayPointer", () => {
  it("sets the overlay CSS cursor from the picked node", () => {
    const { host, emit } = createHost();
    const pick = vi.fn((x: number) => (x > 10 ? "node_btn" : undefined));
    bindPlaybackOverlayPointer({
      host,
      pick,
      cursorFor: (nodeId) => (nodeId === "node_btn" ? "pointer" : ""),
      emit: () => undefined,
    });

    emit("pointermove", { clientX: 4, clientY: 0 });
    expect(host.style.cursor).toBe("");

    emit("pointermove", { clientX: 20, clientY: 0 });
    expect(host.style.cursor).toBe("pointer");
  });

  it("emits pointerover/out when the picked node changes", () => {
    const { host, emit: fire } = createHost();
    const emit = vi.fn();
    bindPlaybackOverlayPointer({
      host,
      pick: (x) => {
        if (x < 0) {
          return undefined;
        }
        return x > 10 ? "node_b" : "node_a";
      },
      cursorFor: () => "",
      emit,
    });

    fire("pointermove", { clientX: 1, clientY: 0 });
    expect(emit).toHaveBeenCalledWith("node_a", "pointerover");

    emit.mockClear();
    fire("pointermove", { clientX: 20, clientY: 0 });
    expect(emit).toHaveBeenCalledWith("node_a", "pointerout");
    expect(emit).toHaveBeenCalledWith("node_b", "pointerover");
  });

  it("emits pointerdown, pointerup, and pointertap on the same node", () => {
    const { host, emit: fire } = createHost();
    const emit = vi.fn();
    bindPlaybackOverlayPointer({
      host,
      pick: () => "node_btn",
      cursorFor: () => "pointer",
      emit,
    });

    fire("pointerdown", { clientX: 1, clientY: 1 });
    fire("pointerup", { clientX: 1, clientY: 1 });
    expect(emit).toHaveBeenCalledWith("node_btn", "pointerdown");
    expect(emit).toHaveBeenCalledWith("node_btn", "pointerup");
    expect(emit).toHaveBeenCalledWith("node_btn", "pointertap");
  });

  it("clears cursor and hover on pointerleave", () => {
    const { host, emit: fire } = createHost();
    const emit = vi.fn();
    bindPlaybackOverlayPointer({
      host,
      pick: () => "node_btn",
      cursorFor: () => "pointer",
      emit,
    });

    fire("pointermove");
    expect(host.style.cursor).toBe("pointer");
    emit.mockClear();
    fire("pointerleave");
    expect(host.style.cursor).toBe("");
    expect(emit).toHaveBeenCalledWith("node_btn", "pointerout");
  });
});
