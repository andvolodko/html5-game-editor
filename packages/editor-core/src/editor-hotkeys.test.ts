import { describe, expect, it, vi } from "vitest";
import {
  bindEditorHotkeys,
  isAssetsPanelKeyTarget,
  type EditorHotkeyHost,
} from "./editor-hotkeys.js";

function mockWindow(): { target: Window; listeners: Map<string, EventListener> } {
  const listeners = new Map<string, EventListener>();
  const target = {
    addEventListener(type: string, listener: EventListener) {
      listeners.set(type, listener);
    },
    removeEventListener(type: string) {
      listeners.delete(type);
    },
  } as unknown as Window;
  return { target, listeners };
}

function mockHost(): EditorHotkeyHost & {
  undo: ReturnType<typeof vi.fn>;
  redo: ReturnType<typeof vi.fn>;
  duplicateNode: ReturnType<typeof vi.fn>;
} {
  return {
    getDirtyState: () => "clean",
    sceneApiConfigured: () => false,
    saveScene: async () => undefined,
    undo: vi.fn(() => true),
    redo: vi.fn(() => true),
    duplicateNode: vi.fn(() => undefined),
    copySelectedNodes: () => false,
    pasteNodes: () => [],
    deleteSelectedNodes: () => undefined,
    requestRename: () => undefined,
    nudgeSelectedNodes: () => false,
  };
}

describe("isAssetsPanelKeyTarget", () => {
  it("returns true when closest finds the assets panel marker", () => {
    const inside = {
      closest(this: object, selector: string) {
        if (this !== inside) {
          throw new TypeError("Illegal invocation");
        }
        return selector === '[data-editor-panel="assets"]' ? {} : null;
      },
    };
    expect(isAssetsPanelKeyTarget(inside)).toBe(true);
  });

  it("returns false outside the assets panel", () => {
    const outside = {
      closest(this: object) {
        if (this !== outside) {
          throw new TypeError("Illegal invocation");
        }
        return null;
      },
    };
    expect(isAssetsPanelKeyTarget(outside)).toBe(false);
    expect(isAssetsPanelKeyTarget(null)).toBe(false);
  });
});

describe("bindEditorHotkeys undo/redo", () => {
  it("undoes with Ctrl+Z and redoes with Ctrl+Y and Ctrl+Shift+Z", () => {
    const host = mockHost();
    const { target, listeners } = mockWindow();
    const dispose = bindEditorHotkeys(host, target);
    const onKeyDown = listeners.get("keydown");
    const preventDefault = vi.fn();

    onKeyDown!({
      key: "z",
      code: "KeyZ",
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      preventDefault,
      target: { tagName: "DIV" },
    } as unknown as Event);
    expect(host.undo).toHaveBeenCalledOnce();

    onKeyDown!({
      key: "y",
      code: "KeyY",
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      preventDefault,
      target: { tagName: "DIV" },
    } as unknown as Event);
    expect(host.redo).toHaveBeenCalledOnce();

    onKeyDown!({
      key: "z",
      code: "KeyZ",
      ctrlKey: true,
      metaKey: false,
      shiftKey: true,
      altKey: false,
      preventDefault,
      target: { tagName: "DIV" },
    } as unknown as Event);
    expect(host.redo).toHaveBeenCalledTimes(2);
    expect(preventDefault).toHaveBeenCalled();
    dispose();
  });

  it("undoes from the Assets panel but does not run scene duplicate there", () => {
    const host = mockHost();
    const { target, listeners } = mockWindow();
    const dispose = bindEditorHotkeys(host, target);
    const onKeyDown = listeners.get("keydown");
    const preventDefault = vi.fn();
    const assetsTarget = {
      tagName: "DIV",
      closest(selector: string) {
        return selector === '[data-editor-panel="assets"]' ? {} : null;
      },
    };

    onKeyDown!({
      key: "z",
      code: "KeyZ",
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      preventDefault,
      target: assetsTarget,
    } as unknown as Event);
    expect(host.undo).toHaveBeenCalledOnce();

    onKeyDown!({
      key: "d",
      code: "KeyD",
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      preventDefault,
      target: assetsTarget,
    } as unknown as Event);
    expect(host.duplicateNode).not.toHaveBeenCalled();
    dispose();
  });

  it("does not undo while typing in an input", () => {
    const host = mockHost();
    const { target, listeners } = mockWindow();
    const dispose = bindEditorHotkeys(host, target);
    const onKeyDown = listeners.get("keydown");

    onKeyDown!({
      key: "z",
      code: "KeyZ",
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      preventDefault: vi.fn(),
      target: { tagName: "INPUT" },
    } as unknown as Event);
    expect(host.undo).not.toHaveBeenCalled();
    dispose();
  });
});
