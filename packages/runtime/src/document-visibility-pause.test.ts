import { describe, expect, it, vi } from "vitest";
import { bindDocumentVisibilityPause } from "./document-visibility-pause.js";

describe("bindDocumentVisibilityPause", () => {
  it("pauses when hidden and resumes when visible", () => {
    const listeners = new Map<string, EventListener>();
    let visibilityState: DocumentVisibilityState = "visible";
    const doc = {
      get visibilityState() {
        return visibilityState;
      },
      addEventListener(type: string, listener: EventListener) {
        listeners.set(type, listener);
      },
      removeEventListener(type: string) {
        listeners.delete(type);
      },
    } as unknown as Document;

    const setPaused = vi.fn();
    const setAudioPaused = vi.fn();
    const dispose = bindDocumentVisibilityPause(
      { setPaused, setAudioPaused },
      doc,
    );

    expect(setPaused).toHaveBeenCalledWith(false);
    expect(setAudioPaused).toHaveBeenCalledWith(false);

    visibilityState = "hidden";
    listeners.get("visibilitychange")?.(new Event("visibilitychange"));
    expect(setPaused).toHaveBeenCalledWith(true);
    expect(setAudioPaused).toHaveBeenCalledWith(true);

    visibilityState = "visible";
    listeners.get("visibilitychange")?.(new Event("visibilitychange"));
    expect(setPaused).toHaveBeenLastCalledWith(false);

    dispose();
    expect(listeners.has("visibilitychange")).toBe(false);
  });
});
