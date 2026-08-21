/** Axis-aligned CSS-pixel rectangle. */
export interface HostSize {
  width: number;
  height: number;
}

/** Visible viewport box, including offset when the visual viewport is inset. */
export interface VisibleViewportRect extends HostSize {
  x: number;
  y: number;
}

/** Treat sizes within this many CSS pixels as equal (rounding / subpixels). */
const SIZE_MATCH_SLACK_PX = 2;
/**
 * Android system bars can make a stale landscape box miss an exact swap
 * against the portrait visual viewport.
 */
const SYSTEM_UI_AXIS_SLACK_PX = 48;

function nearlyEqual(a: number, b: number, slackPx: number): boolean {
  return Math.abs(a - b) <= slackPx;
}

function isLandscape(size: HostSize): boolean {
  return size.width >= size.height;
}

function isSwappedSize(a: HostSize, b: HostSize): boolean {
  return (
    nearlyEqual(a.width, b.height, SIZE_MATCH_SLACK_PX) &&
    nearlyEqual(a.height, b.width, SIZE_MATCH_SLACK_PX)
  );
}

function isNearFullViewport(element: HostSize, viewport: HostSize): boolean {
  const elementMin = Math.min(element.width, element.height);
  const elementMax = Math.max(element.width, element.height);
  const viewportMin = Math.min(viewport.width, viewport.height);
  const viewportMax = Math.max(viewport.width, viewport.height);
  return (
    nearlyEqual(elementMin, viewportMin, SYSTEM_UI_AXIS_SLACK_PX) &&
    nearlyEqual(elementMax, viewportMax, SYSTEM_UI_AXIS_SLACK_PX)
  );
}

function hasArea(size: HostSize): boolean {
  return size.width >= 1 && size.height >= 1;
}

/**
 * Prefer the element's CSS box. When a fullscreen Android WebView keeps the
 * previous orientation's width/height (often swapped vs the visible viewport),
 * use the visible viewport so scaleMode stays uniform in portrait.
 */
export function resolveGameHostSize(
  element: HostSize,
  visibleViewport: HostSize,
): HostSize {
  const elementOk = hasArea(element);
  const viewportOk = hasArea(visibleViewport);
  if (!elementOk) {
    return viewportOk ? { ...visibleViewport } : { ...element };
  }
  if (!viewportOk) {
    return { ...element };
  }
  if (isSwappedSize(element, visibleViewport)) {
    return { ...visibleViewport };
  }
  if (
    isLandscape(element) !== isLandscape(visibleViewport) &&
    isNearFullViewport(element, visibleViewport)
  ) {
    return { ...visibleViewport };
  }
  return { ...element };
}

export interface VisualViewportLike {
  width: number;
  height: number;
  offsetLeft: number;
  offsetTop: number;
}

export interface ViewportReader {
  innerWidth: number;
  innerHeight: number;
  visualViewport?: VisualViewportLike | null;
}

/** CSS pixels actually on screen (`visualViewport`, then `innerWidth`/`innerHeight`). */
export function readVisibleViewportRect(view: ViewportReader): VisibleViewportRect {
  const visual = view.visualViewport;
  if (visual && visual.width >= 1 && visual.height >= 1) {
    return {
      x: Math.round(visual.offsetLeft),
      y: Math.round(visual.offsetTop),
      width: Math.round(visual.width),
      height: Math.round(visual.height),
    };
  }
  return {
    x: 0,
    y: 0,
    width: Math.round(view.innerWidth),
    height: Math.round(view.innerHeight),
  };
}

export interface HostStyleWriter {
  position: string;
  inset: string;
  top: string;
  right: string;
  bottom: string;
  left: string;
  width: string;
  height: string;
}

/**
 * True when the game boot host is a full-window overlay (`position: fixed;
 * inset: 0`), not an editor Preview panel.
 */
export function isInlineFullscreenHost(style: HostStyleWriter): boolean {
  if (style.position !== "fixed" && style.position !== "absolute") {
    return false;
  }
  if (style.inset === "0" || style.inset === "0px") {
    return true;
  }
  const isEdgeZero = (value: string): boolean => value === "0" || value === "0px";
  return (
    isEdgeZero(style.top) &&
    isEdgeZero(style.right) &&
    isEdgeZero(style.bottom) &&
    isEdgeZero(style.left)
  );
}

/** Pin a fullscreen host to the visible viewport so children get a definite box. */
export function pinFullscreenHostBox(
  style: HostStyleWriter,
  viewport: VisibleViewportRect,
): void {
  style.inset = "";
  style.right = "auto";
  style.bottom = "auto";
  style.left = `${viewport.x}px`;
  style.top = `${viewport.y}px`;
  style.width = `${viewport.width}px`;
  style.height = `${viewport.height}px`;
}
