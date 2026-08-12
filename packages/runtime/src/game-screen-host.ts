import {
  fitContainRect,
  type ProjectResolution,
} from "@game-editor/project";

/**
 * Letterboxes a game frame inside a host using contain-fit against a design
 * resolution. Pixi attaches to {@link frame}.
 */
export class GameScreenHost {
  readonly frame: HTMLDivElement;
  private readonly host: HTMLElement;
  private resolution: ProjectResolution;
  private observer: ResizeObserver | undefined;

  constructor(host: HTMLElement, resolution: ProjectResolution) {
    this.host = host;
    this.resolution = {
      width: Math.max(1, Math.floor(resolution.width)),
      height: Math.max(1, Math.floor(resolution.height)),
    };
    this.frame = document.createElement("div");
    this.frame.className = "game-screen-frame";
    this.frame.style.position = "absolute";
    this.frame.style.overflow = "hidden";
    this.frame.style.boxSizing = "border-box";
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

  setResolution(resolution: ProjectResolution): void {
    this.resolution = {
      width: Math.max(1, Math.floor(resolution.width)),
      height: Math.max(1, Math.floor(resolution.height)),
    };
    this.layout();
  }

  /** Recompute frame size/position from the current host box. */
  layout(): void {
    const fitted = fitContainRect(this.resolution, {
      width: this.host.clientWidth,
      height: this.host.clientHeight,
    });
    this.frame.style.left = `${fitted.x}px`;
    this.frame.style.top = `${fitted.y}px`;
    this.frame.style.width = `${fitted.width}px`;
    this.frame.style.height = `${fitted.height}px`;
  }

  destroy(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    this.frame.remove();
  }
}
