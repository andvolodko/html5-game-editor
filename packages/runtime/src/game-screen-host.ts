import {
  fitDesignRect,
  resolveProjectScaleMode,
  type ProjectResolution,
  type ProjectScaleMode,
} from "@game-editor/project";

/**
 * Fits a game frame inside a host against a design resolution.
 * `expand` fills the host so leftover bands stay in Pixi; `cover` crops;
 * `contain` letterboxes. The design rectangle stays centered.
 * Pixi/Three attach to {@link frame}.
 */
export class GameScreenHost {
  readonly frame: HTMLDivElement;
  private readonly host: HTMLElement;
  private readonly previousHostOverflow: string;
  private resolution: ProjectResolution;
  private scaleMode: ProjectScaleMode;
  private observer: ResizeObserver | undefined;

  constructor(
    host: HTMLElement,
    resolution: ProjectResolution,
    scaleMode?: ProjectScaleMode,
  ) {
    this.host = host;
    this.previousHostOverflow = host.style.overflow;
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
    host.style.overflow = "hidden";
    host.appendChild(this.frame);
    this.observer = new ResizeObserver(() => {
      this.layout();
    });
    this.observer.observe(host);
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
    const fitted = fitDesignRect(
      this.resolution,
      {
        width: this.host.clientWidth,
        height: this.host.clientHeight,
      },
      this.scaleMode,
    );
    this.frame.style.left = `${fitted.x}px`;
    this.frame.style.top = `${fitted.y}px`;
    this.frame.style.width = `${fitted.width}px`;
    this.frame.style.height = `${fitted.height}px`;
  }

  destroy(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    this.frame.remove();
    this.host.style.overflow = this.previousHostOverflow;
  }
}
