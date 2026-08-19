import { Graphics } from "pixi.js";
import type { LocalAabb } from "@game-editor/scene";
import {
  EDITOR_ACCENT_COLOR,
  EDITOR_MARQUEE_FILL_ALPHA,
  EDITOR_SELECTION_STROKE_WIDTH,
  GIZMO_FRAME_STROKE_ALPHA,
} from "./editor-chrome.js";
import { viewportChromeInvScale } from "./viewport-camera.js";

/**
 * Editor-only rubber-band overlay in world space. Does not receive hits.
 */
export class PixiMarqueeOverlay {
  readonly root = new Graphics();

  constructor() {
    this.root.label = "marquee-overlay";
    this.root.eventMode = "none";
    this.root.visible = false;
  }

  setWorldRect(rect: LocalAabb | undefined, cameraScale: number): void {
    this.root.clear();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      this.root.visible = false;
      return;
    }
    this.root.visible = true;
    const invScale = viewportChromeInvScale(cameraScale);
    this.root.rect(rect.x, rect.y, rect.width, rect.height);
    this.root.fill({ color: EDITOR_ACCENT_COLOR, alpha: EDITOR_MARQUEE_FILL_ALPHA });
    this.root.stroke({
      width: EDITOR_SELECTION_STROKE_WIDTH * invScale,
      color: EDITOR_ACCENT_COLOR,
      alpha: GIZMO_FRAME_STROKE_ALPHA,
    });
  }

  destroy(): void {
    this.root.destroy();
  }
}
