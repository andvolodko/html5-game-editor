import {
  fitDesignRect,
  resolveProjectScaleMode,
  writeGameLayoutSize,
  type ProjectResolution,
  type ProjectScaleMode,
} from "@game-editor/project";
import { bindViewportRelayout } from "./bind-viewport-relayout.js";
import {
  isInlineFullscreenHost,
  pinFullscreenHostBox,
  readVisibleViewportRect,
  resolveGameHostSize,
} from "./measure-game-host-size.js";

interface SavedHostBoxStyle {
  overflow: string;
  inset: string;
  top: string;
  right: string;
  bottom: string;
  left: string;
  width: string;
  height: string;
}

/**
 * Fits a game frame inside a host against a design resolution.
 * `expand` fills the host so leftover bands stay in Pixi; `cover` crops;
 * `contain` letterboxes. The design rectangle stays centered.
 * Pixi/Three attach to {@link frame}.
 */
export class GameScreenHost {
  readonly frame: HTMLDivElement;
  private readonly host: HTMLElement;
  private readonly previousHostBox: SavedHostBoxStyle;
  private readonly fullscreenHost: boolean;
  private resolution: ProjectResolution;
  private scaleMode: ProjectScaleMode;
  private observer: ResizeObserver | undefined;
  private readonly unbindViewportRelayout: (() => void) | undefined;

  constructor(
    host: HTMLElement,
    resolution: ProjectResolution,
    scaleMode?: ProjectScaleMode,
  ) {
    this.host = host;
    this.previousHostBox = {
      overflow: host.style.overflow,
      inset: host.style.inset,
      top: host.style.top,
      right: host.style.right,
      bottom: host.style.bottom,
      left: host.style.left,
      width: host.style.width,
      height: host.style.height,
    };
    this.fullscreenHost = isInlineFullscreenHost(host.style);
    this.resolution = {
      width: Math.max(1, Math.floor(resolution.width)),
      height: Math.max(1, Math.floor(resolution.height)),
    };
    this.scaleMode = resolveProjectScaleMode(scaleMode);
    this.frame = document.createElement("div");
    this.frame.className = "game-screen-frame";
    this.frame.style.position = "absolute";
    this.frame.style.overflow = "hidden";
    this.frame.style.boxSizing = "border-box";
    this.frame.style.userSelect = "none";
    this.frame.style.webkitUserSelect = "none";
    this.frame.style.touchAction = "none";
    host.style.overflow = "hidden";
    host.appendChild(this.frame);
    if (typeof ResizeObserver !== "undefined") {
      this.observer = new ResizeObserver(() => {
        this.layout();
      });
      this.observer.observe(host);
    }
    if (typeof window !== "undefined") {
      this.unbindViewportRelayout = bindViewportRelayout(
        () => this.layout(),
        window,
      );
    }
    this.layout();
  }

  getResolution(): ProjectResolution {
    return { ...this.resolution };
  }

  getScaleMode(): ProjectScaleMode {
    return this.scaleMode;
  }

  setResolution(resolution: ProjectResolution): void {
    this.resolution = {
      width: Math.max(1, Math.floor(resolution.width)),
      height: Math.max(1, Math.floor(resolution.height)),
    };
    this.layout();
  }

  setScaleMode(scaleMode: ProjectScaleMode): void {
    const next = resolveProjectScaleMode(scaleMode);
    if (next === this.scaleMode) {
      return;
    }
    this.scaleMode = next;
    this.layout();
  }

  /** Recompute frame size/position from the current host box. */
  layout(): void {
    const viewport =
      typeof window !== "undefined"
        ? readVisibleViewportRect(window)
        : {
            x: 0,
            y: 0,
            width: this.host.clientWidth,
            height: this.host.clientHeight,
          };
    if (this.fullscreenHost) {
      pinFullscreenHostBox(this.host.style, viewport);
    }
    const available = this.fullscreenHost
      ? { width: viewport.width, height: viewport.height }
      : resolveGameHostSize(
          {
            width: this.host.clientWidth,
            height: this.host.clientHeight,
          },
          viewport,
        );
    const fitted = fitDesignRect(this.resolution, available, this.scaleMode);
    this.frame.style.left = `${fitted.x}px`;
    this.frame.style.top = `${fitted.y}px`;
    this.frame.style.width = `${fitted.width}px`;
    this.frame.style.height = `${fitted.height}px`;
    writeGameLayoutSize(this.frame, {
      width: fitted.width,
      height: fitted.height,
    });
  }

  destroy(): void {
    this.unbindViewportRelayout?.();
    this.observer?.disconnect();
    this.observer = undefined;
    this.frame.remove();
    this.host.style.overflow = this.previousHostBox.overflow;
    this.host.style.inset = this.previousHostBox.inset;
    this.host.style.top = this.previousHostBox.top;
    this.host.style.right = this.previousHostBox.right;
    this.host.style.bottom = this.previousHostBox.bottom;
    this.host.style.left = this.previousHostBox.left;
    this.host.style.width = this.previousHostBox.width;
    this.host.style.height = this.previousHostBox.height;
  }
}
