import { Application } from "pixi.js";

const FALLBACK_SIZE = 160;
export const ASSET_PREVIEW_BACKGROUND = 0x1a1f2a;

export function previewHostSize(parent: HTMLElement): {
  width: number;
  height: number;
} {
  return {
    width: Math.max(1, parent.clientWidth || FALLBACK_SIZE),
    height: Math.max(1, parent.clientHeight || FALLBACK_SIZE),
  };
}

/** Scale and pan a display object so its local AABB is centered in the preview. */
export function fitDisplayInPreview(
  bounds: { x: number; y: number; width: number; height: number },
  viewWidth: number,
  viewHeight: number,
): { scale: number; x: number; y: number } {
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);
  const scale = Math.min((viewWidth * 0.8) / width, (viewHeight * 0.8) / height);
  return {
    scale,
    x: viewWidth / 2 - (bounds.x + width / 2) * scale,
    y: viewHeight / 2 - (bounds.y + height / 2) * scale,
  };
}

export interface AssetPreviewHost {
  readonly app: Application;
  size(): { width: number; height: number };
  onResize(listener: () => void): void;
  destroy(): void;
}

/** Tiny Pixi application that fills `parent` and resizes with it. */
export async function mountAssetPreviewHost(
  parent: HTMLElement,
): Promise<AssetPreviewHost> {
  const initial = previewHostSize(parent);
  const app = new Application();
  await app.init({
    width: initial.width,
    height: initial.height,
    background: ASSET_PREVIEW_BACKGROUND,
    antialias: false,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });
  parent.appendChild(app.canvas);
  app.canvas.style.width = "100%";
  app.canvas.style.height = "100%";
  app.canvas.style.display = "block";

  let listener: (() => void) | undefined;
  const observer = new ResizeObserver(() => {
    const { width, height } = previewHostSize(parent);
    app.renderer.resize(width, height);
    listener?.();
  });
  observer.observe(parent);

  return {
    app,
    size: () => previewHostSize(parent),
    onResize(next) {
      listener = next;
    },
    destroy() {
      observer.disconnect();
      listener = undefined;
      app.destroy(
        { removeView: true },
        { children: true, texture: false, textureSource: false },
      );
    },
  };
}
