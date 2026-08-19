/**
 * Match a Ctrl/Cmd letter chord by physical key (`code`) with `key` fallback
 * for synthetic events. `code` stays stable across non-Latin layouts.
 */
export function isChordLetter(
  event: Pick<KeyboardEvent, "code" | "key">,
  code: string,
  letter: string,
): boolean {
  if (event.code === code) {
    return true;
  }
  return event.key.toLowerCase() === letter;
}

/** Arrow-key nudge distance in world/local Transform2D pixels. */
export const KEYBOARD_NUDGE_PIXELS = 1;
/** Shift+arrow nudge distance in world/local Transform2D pixels. */
export const KEYBOARD_NUDGE_SHIFT_PIXELS = 10;

export function arrowNudgeDelta(
  key: string,
  step: number = KEYBOARD_NUDGE_PIXELS,
): { dx: number; dy: number } | undefined {
  switch (key) {
    case "ArrowLeft":
      return { dx: -step, dy: 0 };
    case "ArrowRight":
      return { dx: step, dy: 0 };
    case "ArrowUp":
      return { dx: 0, dy: -step };
    case "ArrowDown":
      return { dx: 0, dy: step };
    default:
      return undefined;
  }
}

export interface EditorHotkeyHost {
  getDirtyState(): string;
  sceneApiConfigured(): boolean;
  saveScene(): Promise<void>;
  undo(): boolean;
  redo(): boolean;
  duplicateNode(): string | undefined;
  copySelectedNodes(): boolean;
  pasteNodes(): readonly string[];
  deleteSelectedNodes(): void;
  requestRename(): void;
  /** Returns true when at least one selected node was moved. */
  nudgeSelectedNodes(deltaX: number, deltaY: number): boolean;
}

/** True for inputs/textareas/contentEditable (safe without DOM constructors). */
export function isEditableDomTarget(eventTarget: EventTarget | null): boolean {
  if (eventTarget == null || typeof eventTarget !== "object") {
    return false;
  }
  if (!("tagName" in eventTarget) || typeof eventTarget.tagName !== "string") {
    return false;
  }
  const tag = eventTarget.tagName.toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA") {
    return true;
  }
  return (
    "isContentEditable" in eventTarget &&
    eventTarget.isContentEditable === true
  );
}

function isEditorPanelKeyTarget(
  eventTarget: EventTarget | null,
  panelId: string,
): boolean {
  if (eventTarget == null || typeof eventTarget !== "object") {
    return false;
  }
  if (!("closest" in eventTarget) || typeof eventTarget.closest !== "function") {
    return false;
  }
  // Call as a method so DOM Element.closest keeps its receiver (`this`).
  const el = eventTarget as { closest(selector: string): unknown };
  return el.closest(`[data-editor-panel="${panelId}"]`) != null;
}

/**
 * Assets panel owns Delete/Backspace/F2 for catalogue items. Scene/hierarchy
 * hotkeys must not run while focus is inside that panel.
 */
export function isAssetsPanelKeyTarget(eventTarget: EventTarget | null): boolean {
  return isEditorPanelKeyTarget(eventTarget, "assets");
}

/** True while focus is inside the Hierarchy tree panel. */
export function isHierarchyPanelKeyTarget(
  eventTarget: EventTarget | null,
): boolean {
  return isEditorPanelKeyTarget(eventTarget, "hierarchy");
}

/** True when the user has highlighted DOM text (let the browser copy it). */
function hasDomTextSelection(): boolean {
  if (typeof globalThis.getSelection !== "function") {
    return false;
  }
  const selection = globalThis.getSelection();
  return Boolean(selection && selection.toString().length > 0);
}

/**
 * Central editor shortcuts. Ignores editable DOM targets.
 * Returns disposer. Prefer a single binding from the shell/toolbar.
 * Human-readable list: `docs/hotkeys.md`.
 */
export function bindEditorHotkeys(
  host: EditorHotkeyHost,
  target: Window = window,
): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    const mod = event.ctrlKey || event.metaKey;

    // Save works from editable fields too (avoids browser "Save page").
    // Prefer event.code so Ctrl+S works on non-Latin keyboard layouts.
    if (mod && isChordLetter(event, "KeyS", "s")) {
      event.preventDefault();
      if (host.sceneApiConfigured() && host.getDirtyState() !== "saving") {
        void host.saveScene().catch(() => {
          // failSave already recorded on the document.
        });
      }
      return;
    }

    if (isEditableDomTarget(event.target)) {
      return;
    }

    if (mod && isChordLetter(event, "KeyZ", "z") && event.shiftKey) {
      event.preventDefault();
      host.redo();
      return;
    }
    if (mod && isChordLetter(event, "KeyY", "y") && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      host.redo();
      return;
    }
    if (mod && isChordLetter(event, "KeyZ", "z")) {
      event.preventDefault();
      host.undo();
      return;
    }

    // Catalogue shortcuts are handled by AssetsPanel while it has focus.
    // Undo/redo stay global so history works from that panel too.
    if (isAssetsPanelKeyTarget(event.target)) {
      return;
    }
    if (mod && isChordLetter(event, "KeyD", "d")) {
      event.preventDefault();
      host.duplicateNode();
      return;
    }
    if (mod && isChordLetter(event, "KeyC", "c") && !event.shiftKey && !event.altKey) {
      if (hasDomTextSelection()) {
        return;
      }
      event.preventDefault();
      host.copySelectedNodes();
      return;
    }
    if (mod && isChordLetter(event, "KeyV", "v") && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      host.pasteNodes();
      return;
    }
    if (event.key === "Delete") {
      event.preventDefault();
      host.deleteSelectedNodes();
      return;
    }
    if (event.key === "F2") {
      event.preventDefault();
      host.requestRename();
      return;
    }

    // Arrow keys nudge selection (1px, or 10px with Shift). Skip Ctrl/Cmd/Alt
    // so browser/OS chords keep working. Hierarchy owns arrows while focused.
    if (!mod && !event.altKey) {
      if (isHierarchyPanelKeyTarget(event.target)) {
        return;
      }
      const step = event.shiftKey
        ? KEYBOARD_NUDGE_SHIFT_PIXELS
        : KEYBOARD_NUDGE_PIXELS;
      const delta = arrowNudgeDelta(event.key, step);
      if (delta) {
        if (host.nudgeSelectedNodes(delta.dx, delta.dy)) {
          event.preventDefault();
        }
      }
    }
  };

  target.addEventListener("keydown", onKeyDown);
  return () => target.removeEventListener("keydown", onKeyDown);
}
