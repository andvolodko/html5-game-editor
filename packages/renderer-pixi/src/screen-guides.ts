import { Container, Graphics, Text } from "pixi.js";
import { viewportChromeInvScale } from "./viewport-camera.js";

export type ScreenGuideOrientation = "landscape" | "portrait";

export interface ScreenGuidePreset {
  id: string;
  label: string;
  orientation: ScreenGuideOrientation;
  width: number;
  height: number;
}

/**
 * Popular HTML5 / mobile preview frames (landscape + portrait).
 * Drawn in world space from the origin; preview-only, never persisted.
 */
export const POPULAR_SCREEN_PRESETS: readonly ScreenGuidePreset[] = [
  {
    id: "iphone-14-pt",
    label: "iPhone 14",
    orientation: "portrait",
    width: 390,
    height: 844,
  },
  {
    id: "iphone-14-ls",
    label: "iPhone 14",
    orientation: "landscape",
    width: 844,
    height: 390,
  },
  {
    id: "android-pt",
    label: "Android",
    orientation: "portrait",
    width: 360,
    height: 800,
  },
  {
    id: "android-ls",
    label: "Android",
    orientation: "landscape",
    width: 800,
    height: 360,
  },
  {
    id: "ipad-pt",
    label: "iPad",
    orientation: "portrait",
    width: 768,
    height: 1024,
  },
  {
    id: "ipad-ls",
    label: "iPad",
    orientation: "landscape",
    width: 1024,
    height: 768,
  },
  {
    id: "hd-ls",
    label: "720p",
    orientation: "landscape",
    width: 1280,
    height: 720,
  },
  {
    id: "fhd-ls",
    label: "1080p",
    orientation: "landscape",
    width: 1920,
    height: 1080,
  },
];

export interface ScreenGuidesStyle {
  landscapeColor: number;
  portraitColor: number;
  lineAlpha: number;
  labelAlpha: number;
  labelSize: number;
  /** On-segment length for dashed outline strokes. */
  dashLength: number;
  /** Gap length between dashes. */
  dashGap: number;
}

export const DEFAULT_SCREEN_GUIDES_STYLE: ScreenGuidesStyle = {
  landscapeColor: 0x5ad67d,
  portraitColor: 0xf0a15a,
  lineAlpha: 0.4,
  labelAlpha: 0.4,
  labelSize: 11,
  dashLength: 8,
  dashGap: 5,
};

/**
 * Editor-only device-frame outlines behind / around scene content.
 * Does not participate in hit-testing.
 */
export class ScreenGuidesOverlay {
  readonly root = new Container();
  private readonly graphics = new Graphics();
  private readonly labels = new Container();
  private style: ScreenGuidesStyle;
  private presets: readonly ScreenGuidePreset[];
  private visible = true;
  private showLandscape = true;
  private showPortrait = true;
  private cameraScale = 1;

  constructor(
    presets: readonly ScreenGuidePreset[] = POPULAR_SCREEN_PRESETS,
    style: Partial<ScreenGuidesStyle> = {},
  ) {
    this.presets = presets;
    this.style = { ...DEFAULT_SCREEN_GUIDES_STYLE, ...style };
    this.root.eventMode = "none";
    this.root.label = "screen-guides";
    this.graphics.eventMode = "none";
    this.labels.eventMode = "none";
    this.root.addChild(this.graphics, this.labels);
    this.redraw();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.root.visible = visible;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setOrientationFilter(options: {
    landscape?: boolean;
    portrait?: boolean;
  }): void {
    if (options.landscape !== undefined) {
      this.showLandscape = options.landscape;
    }
    if (options.portrait !== undefined) {
      this.showPortrait = options.portrait;
    }
    this.redraw(this.cameraScale);
  }

  getOrientationFilter(): { landscape: boolean; portrait: boolean } {
    return {
      landscape: this.showLandscape,
      portrait: this.showPortrait,
    };
  }

  setPresets(presets: readonly ScreenGuidePreset[]): void {
    this.presets = presets;
    this.redraw(this.cameraScale);
  }

  redraw(cameraScale = this.cameraScale): void {
    this.cameraScale = cameraScale;
    this.graphics.clear();
    this.labels.removeChildren().forEach((child) => {
      child.destroy();
    });
    if (!this.visible) {
      return;
    }

    const inv = viewportChromeInvScale(cameraScale);
    const strokeWidth = 1 * inv;
    const dashLength = this.style.dashLength * inv;
    const dashGap = this.style.dashGap * inv;
    const labelPad = 4 * inv;

    for (const preset of this.presets) {
      if (preset.orientation === "landscape" && !this.showLandscape) {
        continue;
      }
      if (preset.orientation === "portrait" && !this.showPortrait) {
        continue;
      }
      const color =
        preset.orientation === "landscape"
          ? this.style.landscapeColor
          : this.style.portraitColor;
      strokeDashedRect(
        this.graphics,
        0,
        0,
        preset.width,
        preset.height,
        dashLength,
        dashGap,
      );
      this.graphics.stroke({
        color,
        width: strokeWidth,
        alpha: this.style.lineAlpha,
      });

      const label = new Text({
        text: `${preset.label} ${preset.width}×${preset.height} ${
          preset.orientation === "landscape" ? "LS" : "PT"
        }`,
        style: {
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          fontSize: this.style.labelSize,
          fill: color,
        },
      });
      label.alpha = this.style.labelAlpha;
      // Keep label size/padding constant on screen while the frame stays world-space.
      label.scale.set(inv);
      label.position.set(
        labelPad,
        Math.max(
          labelPad,
          preset.height - (this.style.labelSize + 4) * inv,
        ),
      );
      this.labels.addChild(label);
    }
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}

/**
 * Pixi v8 Graphics has no dash style — emit dash segments as moveTo/lineTo.
 */
function strokeDashedRect(
  graphics: Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  dashLength: number,
  dashGap: number,
): void {
  strokeDashedLine(graphics, x, y, x + width, y, dashLength, dashGap);
  strokeDashedLine(
    graphics,
    x + width,
    y,
    x + width,
    y + height,
    dashLength,
    dashGap,
  );
  strokeDashedLine(
    graphics,
    x + width,
    y + height,
    x,
    y + height,
    dashLength,
    dashGap,
  );
  strokeDashedLine(graphics, x, y + height, x, y, dashLength, dashGap);
}

function strokeDashedLine(
  graphics: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dashLength: number,
  dashGap: number,
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (!(length > 0) || !(dashLength > 0)) {
    graphics.moveTo(x1, y1);
    graphics.lineTo(x2, y2);
    return;
  }

  const gap = dashGap > 0 ? dashGap : dashLength;
  const ux = dx / length;
  const uy = dy / length;
  let distance = 0;
  let drawing = true;

  while (distance < length) {
    const segment = Math.min(
      drawing ? dashLength : gap,
      length - distance,
    );
    const startX = x1 + ux * distance;
    const startY = y1 + uy * distance;
    const endX = x1 + ux * (distance + segment);
    const endY = y1 + uy * (distance + segment);
    if (drawing) {
      graphics.moveTo(startX, startY);
      graphics.lineTo(endX, endY);
    }
    distance += segment;
    drawing = !drawing;
  }
}
