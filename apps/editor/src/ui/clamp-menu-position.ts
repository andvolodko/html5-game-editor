/** Keep context menus inset from the window edge after flipping/clamping. */
export const CONTEXT_MENU_VIEWPORT_MARGIN_PX = 8;

export interface MenuPositionInput {
  x: number;
  y: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  margin?: number;
}

/**
 * Place a menu at the cursor, flipping up/left when it would overflow, then
 * clamping into the viewport.
 */
export function clampMenuPosition(input: MenuPositionInput): { x: number; y: number } {
  const margin = input.margin ?? CONTEXT_MENU_VIEWPORT_MARGIN_PX;
  const maxX = Math.max(margin, input.viewportWidth - input.width - margin);
  const maxY = Math.max(margin, input.viewportHeight - input.height - margin);

  let x = input.x;
  let y = input.y;
  if (x + input.width + margin > input.viewportWidth) {
    x = input.x - input.width;
  }
  if (y + input.height + margin > input.viewportHeight) {
    y = input.y - input.height;
  }

  return {
    x: Math.min(Math.max(x, margin), maxX),
    y: Math.min(Math.max(y, margin), maxY),
  };
}
