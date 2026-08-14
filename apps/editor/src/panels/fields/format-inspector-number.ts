/** Inspector float display digits (Unity / Godot / Cocos-style). */
export const INSPECTOR_NUMBER_DECIMALS = 3;

/**
 * Format a number for Inspector inputs. Rounds for display only; does not
 * change stored scene values.
 */
export function formatInspectorNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  const rounded = Number(value.toFixed(INSPECTOR_NUMBER_DECIMALS));
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

/** True when the draft is the formatted display or the exact stored value. */
export function inspectorNumberUnchanged(draft: string, stored: number): boolean {
  if (draft === formatInspectorNumber(stored)) {
    return true;
  }
  return Number(draft) === stored;
}

/**
 * Keep the stored float when the user did not edit past display rounding.
 * `undefined` means the draft is not a number.
 */
export function resolveInspectorNumber(
  draft: string,
  stored: number,
): number | undefined {
  if (inspectorNumberUnchanged(draft, stored)) {
    return stored;
  }
  const next = Number(draft);
  if (Number.isNaN(next)) {
    return undefined;
  }
  return next;
}
