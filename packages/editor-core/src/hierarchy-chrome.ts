export const HIERARCHY_CHROME_ATTR = "data-hierarchy-chrome";

/**
 * True when a Hierarchy pointer event started on eye/lock (or other chrome)
 * controls that must not select the row or begin a drag.
 */
export function isHierarchyChromeEventTarget(
  target: EventTarget | null,
): boolean {
  if (target === null || typeof target !== "object") {
    return false;
  }
  if (!("closest" in target) || typeof (target as { closest?: unknown }).closest !== "function") {
    return false;
  }
  const el = target as { closest(selector: string): unknown };
  return el.closest(`[${HIERARCHY_CHROME_ATTR}]`) != null;
}
