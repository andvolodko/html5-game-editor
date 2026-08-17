import { Graphics } from "pixi.js";
import {
  occupiedTileBounds,
  type TilemapComponentData,
} from "@game-editor/scene";
import { EDITOR_ACCENT_COLOR } from "./editor-chrome.js";
import { iterateGridLines } from "./pixel-grid.js";
import { viewportChromeInvScale } from "./viewport-camera.js";

const GRID_PAD_TILES = 8;
const MINOR_ALPHA = 0.22;
const ORIGIN_ALPHA = 0.55;

/**
 * One Graphics overlay for the selected Tilemap's cell grid (editor-only).
 */
export class TilemapGridOverlay {
  readonly root = new Graphics();

  constructor() {
    this.root.eventMode = "none";
    this.root.label = "tilemap-grid";
  }

  redraw(
    tilemap: TilemapComponentData,
    visibleLocal: { minX: number; minY: number; maxX: number; maxY: number },
    cameraScale: number,
  ): void {
    this.root.visible = true;
    this.root.clear();
    const width = tilemap.tileWidth;
    const height = tilemap.tileHeight;
    if (!(width > 0) || !(height > 0)) {
      return;
    }
    const occupied = occupiedTileBounds(tilemap);
    const padX = GRID_PAD_TILES * width;
    const padY = GRID_PAD_TILES * height;
    let minX = visibleLocal.minX - padX;
    let minY = visibleLocal.minY - padY;
    let maxX = visibleLocal.maxX + padX;
    let maxY = visibleLocal.maxY + padY;
    if (occupied) {
      minX = Math.min(minX, occupied.minX * width);
      minY = Math.min(minY, occupied.minY * height);
      maxX = Math.max(maxX, (occupied.maxX + 1) * width);
      maxY = Math.max(maxY, (occupied.maxY + 1) * height);
    }
    const strokeWidth = viewportChromeInvScale(cameraScale);
    const xs = iterateGridLines(minX, maxX, width);
    const ys = iterateGridLines(minY, maxY, height);
    for (const x of xs) {
      this.root.moveTo(x, minY);
      this.root.lineTo(x, maxY);
      this.root.stroke({
        color: x === 0 ? EDITOR_ACCENT_COLOR : 0xffffff,
        width: strokeWidth,
        alpha: x === 0 ? ORIGIN_ALPHA : MINOR_ALPHA,
      });
    }
    for (const y of ys) {
      this.root.moveTo(minX, y);
      this.root.lineTo(maxX, y);
      this.root.stroke({
        color: y === 0 ? EDITOR_ACCENT_COLOR : 0xffffff,
        width: strokeWidth,
        alpha: y === 0 ? ORIGIN_ALPHA : MINOR_ALPHA,
      });
    }
  }

  destroy(): void {
    this.root.destroy();
  }

  hide(): void {
    this.root.visible = false;
    this.root.removeFromParent();
  }
}
