/**
 * Explorer / ARIA-tree keyboard intents for Hierarchy and Assets.
 * Panels apply the intent (select, expand, open) against their own models.
 */

/** Sentinel id for the Hierarchy scene row in the visible keyboard list. */
export const HIERARCHY_SCENE_ROW_ID = "__hierarchy_scene__";

/** Visible rows jumped by PageUp / PageDown in tree panels. */
export const TREE_KEYBOARD_PAGE_SIZE = 10;

export type TreeKeyboardIntent =
  | { type: "select"; id: string }
  | { type: "expand" }
  | { type: "collapse" }
  | { type: "toggle-expand" }
  | { type: "activate" }
  | { type: "select-all" };

export interface TreeKeyboardInput {
  key: string;
  code?: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  visibleIds: readonly string[];
  currentId: string | undefined;
  expanded: boolean;
  hasChildren: boolean;
  parentId: string | undefined;
  firstChildId: string | undefined;
  /** When false, Left/Right/Space do not expand or collapse (e.g. Hierarchy search). */
  expandEnabled?: boolean;
}

/**
 * Next visible id after moving `delta` steps. Clamps to the ends.
 * Missing / empty current id starts at the first row (down) or last row (up).
 */
export function adjacentVisibleId(
  visibleIds: readonly string[],
  currentId: string | undefined,
  delta: number,
): string | undefined {
  if (visibleIds.length === 0) {
    return undefined;
  }
  const lastIndex = visibleIds.length - 1;
  if (currentId === undefined) {
    return delta >= 0 ? visibleIds[0] : visibleIds[lastIndex];
  }
  const index = visibleIds.indexOf(currentId);
  if (index < 0) {
    return delta >= 0 ? visibleIds[0] : visibleIds[lastIndex];
  }
  const next = Math.min(lastIndex, Math.max(0, index + delta));
  return visibleIds[next];
}

function selectIntent(id: string | undefined): TreeKeyboardIntent | undefined {
  return id === undefined ? undefined : { type: "select", id };
}

function isSelectAllChord(input: TreeKeyboardInput): boolean {
  const mod = input.ctrlKey || input.metaKey;
  if (!mod || input.shiftKey || input.altKey) {
    return false;
  }
  if (input.code === "KeyA") {
    return true;
  }
  return input.key.toLowerCase() === "a";
}

function isSpaceKey(input: TreeKeyboardInput): boolean {
  return input.key === " " || input.code === "Space";
}

/**
 * Map a keydown to a tree action. Modifier chords other than Ctrl/Cmd+A
 * are left for panel-specific copy/paste/delete handlers.
 */
export function resolveTreeKeyboardIntent(
  input: TreeKeyboardInput,
): TreeKeyboardIntent | undefined {
  if (input.altKey) {
    return undefined;
  }
  if (isSelectAllChord(input)) {
    return { type: "select-all" };
  }
  if (input.ctrlKey || input.metaKey) {
    return undefined;
  }

  const expandEnabled = input.expandEnabled !== false;

  switch (input.key) {
    case "ArrowDown":
      return selectIntent(adjacentVisibleId(input.visibleIds, input.currentId, 1));
    case "ArrowUp":
      return selectIntent(
        adjacentVisibleId(input.visibleIds, input.currentId, -1),
      );
    case "Home":
      return selectIntent(input.visibleIds[0]);
    case "End":
      return selectIntent(input.visibleIds[input.visibleIds.length - 1]);
    case "PageDown":
      return selectIntent(
        adjacentVisibleId(
          input.visibleIds,
          input.currentId,
          TREE_KEYBOARD_PAGE_SIZE,
        ),
      );
    case "PageUp":
      return selectIntent(
        adjacentVisibleId(
          input.visibleIds,
          input.currentId,
          -TREE_KEYBOARD_PAGE_SIZE,
        ),
      );
    case "ArrowRight": {
      if (!expandEnabled || !input.hasChildren) {
        return undefined;
      }
      if (!input.expanded) {
        return { type: "expand" };
      }
      return selectIntent(input.firstChildId);
    }
    case "ArrowLeft": {
      if (expandEnabled && input.hasChildren && input.expanded) {
        return { type: "collapse" };
      }
      return selectIntent(input.parentId);
    }
    case "Enter":
      return { type: "activate" };
    default:
      if (isSpaceKey(input)) {
        if (!expandEnabled || !input.hasChildren) {
          return undefined;
        }
        return { type: "toggle-expand" };
      }
      return undefined;
  }
}
