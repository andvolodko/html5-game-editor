export interface ListSelectionModifiers {
  shiftKey: boolean;
  /** Ctrl on Windows/Linux, Cmd on macOS. */
  toggleKey: boolean;
}

export function isToggleSelectionKey(event: {
  ctrlKey: boolean;
  metaKey: boolean;
}): boolean {
  return event.ctrlKey || event.metaKey;
}

/**
 * Inclusive slice of `orderedIds` from `fromId` to `toId` (either direction).
 * Missing ids fall back to the clicked end only.
 */
export function idsBetweenInclusive(
  orderedIds: readonly string[],
  fromId: string,
  toId: string,
): string[] {
  const from = orderedIds.indexOf(fromId);
  const to = orderedIds.indexOf(toId);
  if (from < 0 || to < 0) {
    return to >= 0 ? [toId] : from >= 0 ? [fromId] : [toId];
  }
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  return orderedIds.slice(start, end + 1);
}

function withPrimaryLast(ids: readonly string[], primaryId: string): string[] {
  return [...ids.filter((id) => id !== primaryId), primaryId];
}

/**
 * Explorer-style list selection.
 * Click replaces; Ctrl/Cmd toggles; Shift selects the visible range from the
 * anchor; Ctrl+Shift unions that range with the current selection.
 * Shift keeps the original anchor so repeated Shift-clicks can retarget.
 */
export function applyListSelection(
  orderedIds: readonly string[],
  currentIds: readonly string[],
  clickedId: string,
  modifiers: ListSelectionModifiers,
  anchorId: string | undefined,
): { selected: string[]; anchor: string } {
  if (modifiers.shiftKey) {
    const from =
      anchorId !== undefined && orderedIds.includes(anchorId)
        ? anchorId
        : clickedId;
    const range = idsBetweenInclusive(orderedIds, from, clickedId);
    if (modifiers.toggleKey) {
      const existing = new Set(currentIds);
      const selected = [
        ...currentIds,
        ...range.filter((id) => !existing.has(id)),
      ];
      return { selected: withPrimaryLast(selected, clickedId), anchor: from };
    }
    return { selected: withPrimaryLast(range, clickedId), anchor: from };
  }

  if (modifiers.toggleKey) {
    if (currentIds.includes(clickedId)) {
      return {
        selected: currentIds.filter((id) => id !== clickedId),
        anchor: clickedId,
      };
    }
    return { selected: [...currentIds, clickedId], anchor: clickedId };
  }

  return { selected: [clickedId], anchor: clickedId };
}
