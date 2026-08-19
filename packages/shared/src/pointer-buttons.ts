/** Primary / left mouse button (`PointerEvent.button`). */
export const MOUSE_BUTTON_PRIMARY = 0;

/** Auxiliary / middle / wheel button (`PointerEvent.button`). */
export const MOUSE_BUTTON_MIDDLE = 1;

/** Secondary / right mouse button (`PointerEvent.button`). */
export const MOUSE_BUTTON_SECONDARY = 2;

/** Modifier keys on a viewport pointer event. */
export interface ViewportPointerModifiers {
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}

export function viewportPointerModifiersFrom(
  event: Pick<ViewportPointerModifiers, "shiftKey" | "ctrlKey" | "metaKey">,
): ViewportPointerModifiers {
  return {
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
  };
}
