export interface LayoutSize {
  width: number;
  height: number;
}

export interface DatasetLayoutTarget {
  dataset: {
    gameLayoutWidth?: string;
    gameLayoutHeight?: string;
  };
}

export function writeGameLayoutSize(
  target: DatasetLayoutTarget,
  size: LayoutSize,
): void {
  target.dataset.gameLayoutWidth = String(Math.max(1, Math.round(size.width)));
  target.dataset.gameLayoutHeight = String(Math.max(1, Math.round(size.height)));
}

export function readGameLayoutSizeFromDataset(
  target: DatasetLayoutTarget,
): LayoutSize | undefined {
  const width = Number(target.dataset.gameLayoutWidth);
  const height = Number(target.dataset.gameLayoutHeight);
  if (!(width >= 1) || !(height >= 1)) {
    return undefined;
  }
  return { width, height };
}

export interface MeasureParentElement {
  clientWidth: number;
  clientHeight: number;
  dataset: DatasetLayoutTarget["dataset"];
  parentElement: MeasureParentElement | null;
  getBoundingClientRect?: () => { width: number; height: number };
  style?: { width: string; height: string };
}

function parsePx(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Prefer the fitted frame size GameScreenHost wrote, then the laid-out box.
 * `clientHeight` on Android / DevTools device mode is often the 16:9 strip.
 */
export function measurePlaybackParentSize(
  element: MeasureParentElement,
): LayoutSize {
  let current: MeasureParentElement | null = element;
  while (current) {
    const written = readGameLayoutSizeFromDataset(current);
    if (written) {
      return written;
    }
    current = current.parentElement;
  }
  const rect = element.getBoundingClientRect?.();
  const styleWidth = parsePx(element.style?.width);
  const styleHeight = parsePx(element.style?.height);
  const width = Math.max(
    element.clientWidth,
    rect ? Math.round(rect.width) : 0,
    Math.round(styleWidth),
  );
  const height = Math.max(
    element.clientHeight,
    rect ? Math.round(rect.height) : 0,
    Math.round(styleHeight),
  );
  return { width, height };
}
