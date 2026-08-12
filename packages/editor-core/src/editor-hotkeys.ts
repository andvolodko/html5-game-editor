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

export function arrowNudgeDelta(
  key: string,
): { dx: number; dy: number } | undefined {
  switch (key) {
    case "ArrowLeft":
      return { dx: -KEYBOARD_NUDGE_PIXELS, dy: 0 };
    case "ArrowRight":
      return { dx: KEYBOARD_NUDGE_PIXELS, dy: 0 };
    case "ArrowUp":
      return { dx: 0, dy: -KEYBOARD_NUDGE_PIXELS };
    case "ArrowDown":
      return { dx: 0, dy: KEYBOARD_NUDGE_PIXELS };
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
  deleteSelectedNodes(): void;
  requestRename(): void;
  /** Returns true when at least one selected node was moved. */
  nudgeSelectedNodes(deltaX: number, deltaY: number): boolean;
}

/** True for inputs/textareas/contentEditable (safe without DOM constructors). */
function isEditableDomTarget(eventTarget: EventTarget | null): boolean {
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

/**
 * Assets panel owns Delete/Backspace/F2 for catalogue items. Scene/hierarchy
 * hotkeys must not run while focus is inside that panel.
 */
export function isAssetsPanelKeyTarget(eventTarget: EventTarget | null): boolean {
  if (eventTarget == null || typeof eventTarget !== "object") {
    return false;
  }
  if (!("closest" in eventTarget) || typeof eventTarget.closest !== "function") {
    return false;
  }
  const closest = eventTarget.closest as (selector: string) => unknown;
  return closest('[data-editor-panel="assets"]') != null;
}

/**
 * Central editor shortcuts. Ignores editable DOM targets.
 * Returns disposer. Prefer a single binding from the shell/toolbar.
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

    // Catalogue shortcuts are handled by AssetsPanel while it has focus.
    if (isAssetsPanelKeyTarget(event.target)) {
      return;
    }

    if (mod && isChordLetter(event, "KeyZ", "z") && event.shiftKey) {
      event.preventDefault();
      host.redo();
      return;
    }
    if (mod && isChordLetter(event, "KeyZ", "z")) {
      event.preventDefault();
      host.undo();
      return;
    }
    if (mod && isChordLetter(event, "KeyD", "d")) {
      event.preventDefault();
      host.duplicateNode();
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

    // Arrow keys nudge selection by 1px. Skip when modifiers are held
    // so browser/OS chords keep working.
    if (!mod && !event.altKey && !event.shiftKey) {
      const delta = arrowNudgeDelta(event.key);
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
