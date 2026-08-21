/**
 * Android WebView often fires `orientationchange` before the layout viewport
 * updates, and ResizeObserver may not run at all. Relayout immediately and
 * again after the WebView settles.
 */
const ORIENTATION_RELAYOUT_MS = 50;
const WEBVIEW_SETTLE_RELAYOUT_MS = 200;

export const VIEWPORT_RELAYOUT_DELAYS_MS = [
  0,
  ORIENTATION_RELAYOUT_MS,
  WEBVIEW_SETTLE_RELAYOUT_MS,
] as const;

export interface ViewportRelayoutView {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
  setTimeout(handler: () => void, delayMs: number): number;
  clearTimeout(id: number): void;
  visualViewport?: {
    addEventListener(type: string, listener: () => void): void;
    removeEventListener(type: string, listener: () => void): void;
  } | null;
}

/**
 * Calls `layout` on window resize / orientation change / visualViewport resize,
 * including delayed retries so portrait scale is computed after Android settles.
 */
export function bindViewportRelayout(
  layout: () => void,
  view: ViewportRelayoutView,
): () => void {
  const pendingTimeouts: number[] = [];

  const clearPending = (): void => {
    for (const id of pendingTimeouts) {
      view.clearTimeout(id);
    }
    pendingTimeouts.length = 0;
  };

  const schedule = (): void => {
    clearPending();
    for (const delayMs of VIEWPORT_RELAYOUT_DELAYS_MS) {
      if (delayMs === 0) {
        layout();
        continue;
      }
      pendingTimeouts.push(view.setTimeout(layout, delayMs));
    }
  };

  view.addEventListener("resize", schedule);
  view.addEventListener("orientationchange", schedule);
  view.visualViewport?.addEventListener("resize", schedule);

  return () => {
    clearPending();
    view.removeEventListener("resize", schedule);
    view.removeEventListener("orientationchange", schedule);
    view.visualViewport?.removeEventListener("resize", schedule);
  };
}
