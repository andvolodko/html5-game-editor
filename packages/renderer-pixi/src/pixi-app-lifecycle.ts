import { Application, type Ticker } from "pixi.js";
import type { Container, FederatedPointerEvent } from "pixi.js";
import {
  MOUSE_BUTTON_MIDDLE,
  type ViewportPointerModifiers,
  viewportPointerModifiersFrom,
} from "@game-editor/shared";
import { playbackCameraForParent, measurePlaybackParentSize } from "@game-editor/project";
import type { Vec2 } from "@game-editor/scene";
import { applyPlaybackCanvasLayout } from "./playback-canvas-layout.js";
import { clientPointToWorld } from "./viewport-math.js";
import type { ViewportCameraController } from "./viewport-camera-controller.js";
import type { PixiRuntimeGraph } from "./pixi-runtime-nodes.js";
import type { PixelGridOverlay } from "./pixel-grid.js";
import type { ScreenGuidesOverlay } from "./screen-guides.js";

/** Match Three playback; uncapped DPR × world-size buffers overflow mobile GPUs. */
const PLAYBACK_MAX_PIXEL_RATIO = 2;

/** Browser console / DevTools bridges for the live Pixi Application. */
interface PixiDebugGlobals {
  __PIXI_APP__?: Application;
  game?: { pixi?: Application };
}

function pixiDebugGlobals(): PixiDebugGlobals {
  return globalThis as PixiDebugGlobals;
}

function isGizmoPointerTarget(target: unknown): boolean {
  let current = target as { label?: string; parent?: unknown } | null | undefined;
  while (current) {
    if (typeof current.label === "string" && current.label.startsWith("gizmo")) {
      return true;
    }
    current = current.parent as typeof current;
  }
  return false;
}

function publishPixiApp(app: Application): void {
  const globals = pixiDebugGlobals();
  // PixiJS DevTools bridge (browser extension detects this global).
  globals.__PIXI_APP__ = app;
  globals.game = { ...globals.game, pixi: app };
}

function clearPublishedPixiApp(destroyedApp: Application | undefined): void {
  const globals = pixiDebugGlobals();
  if (globals.__PIXI_APP__ === destroyedApp) {
    globals.__PIXI_APP__ = undefined;
  }
  const game = globals.game;
  if (game && game.pixi === destroyedApp) {
    game.pixi = undefined;
  }
}

export interface PixiAppLifecycleHost {
  canvasParent: HTMLElement;
  background: number;
  backgroundAlpha: number;
  designResolution: { width: number; height: number } | undefined;
  editable: boolean;
  camera: ViewportCameraController;
  graph: PixiRuntimeGraph;
  pixelGrid: PixelGridOverlay | undefined;
  screenGuides: ScreenGuidesOverlay | undefined;
  marqueeRoot?: Container;
  onBackgroundPointerDown(): void;
  onWorldPointerDown?(
    world: Vec2,
    button: number,
    modifiers: ViewportPointerModifiers,
    client: { x: number; y: number },
  ): boolean;
  onWorldPointerMove?(world: Vec2): void;
  onWorldPointerUp?(world: Vec2): void;
  onResize(): void;
  onTick?(ticker: Ticker): void;
}

/**
 * Owns Pixi Application init/destroy, parent resize observation, and size sync.
 */
export class PixiAppLifecycle {
  app: Application | undefined;
  width = 0;
  height = 0;
  ready = false;
  private parentResizeObserver: ResizeObserver | undefined;
  private designFitRafId = 0;
  private readonly initPromise: Promise<void>;
  private tickerPaused = false;

  constructor(
    private readonly host: PixiAppLifecycleHost,
    headless: boolean,
  ) {
    this.initPromise = headless
      ? Promise.resolve().then(() => {
          this.ready = true;
        })
      : this.init();
  }

  whenReady(): Promise<void> {
    return this.initPromise;
  }

  isReady(): boolean {
    return this.ready;
  }

  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  clientToWorld(clientX: number, clientY: number): Vec2 {
    const canvas = this.app?.canvas;
    if (!canvas || !this.app) {
      return { x: 0, y: 0 };
    }
    const rect = canvas.getBoundingClientRect();
    const camera = this.host.camera.getState();
    return clientPointToWorld({
      clientX,
      clientY,
      canvasLeft: rect.left,
      canvasTop: rect.top,
      canvasWidth: rect.width,
      canvasHeight: rect.height,
      screenWidth: this.app.screen.width,
      screenHeight: this.app.screen.height,
      panX: camera.pan.x,
      panY: camera.pan.y,
      scale: camera.scale,
    });
  }

  private async init(): Promise<void> {
    const app = new Application();
    const design = this.host.designResolution;
    const pixelRatio = window.devicePixelRatio || 1;
    await app.init({
      background: this.host.background,
      backgroundAlpha: this.host.backgroundAlpha,
      antialias: true,
      autoDensity: true,
      resolution: design
        ? Math.min(pixelRatio, PLAYBACK_MAX_PIXEL_RATIO)
        : pixelRatio,
      ...(design
        ? { width: design.width, height: design.height }
        : { resizeTo: this.host.canvasParent }),
    });
    this.app = app;
    publishPixiApp(app);
    app.stage.label = "stage";
    this.fillDesignCanvasCss();
    this.host.canvasParent.appendChild(app.canvas);
    if (this.host.pixelGrid) {
      this.host.camera.root.addChild(this.host.pixelGrid.root);
    }
    if (this.host.screenGuides) {
      this.host.camera.root.addChild(this.host.screenGuides.root);
    }
    this.host.camera.root.addChild(this.host.graph.world);
    if (this.host.marqueeRoot) {
      this.host.camera.root.addChild(this.host.marqueeRoot);
    }
    app.stage.addChild(this.host.camera.root);
    // Preview camera pan/wheel is editor-only; games must not get it.
    if (this.host.editable) {
      this.host.camera.attach(app);
    }
    app.stage.eventMode = "static";
    app.stage.hitArea = app.screen;
    app.stage.addEventListener(
      "pointerdown",
      (event: FederatedPointerEvent) => {
        if (event.button === MOUSE_BUTTON_MIDDLE) {
          return;
        }
        if (isGizmoPointerTarget(event.target)) {
          return;
        }
        const world = this.clientToWorld(event.clientX, event.clientY);
        const consumed = this.host.onWorldPointerDown?.(
          world,
          event.button,
          viewportPointerModifiersFrom(event),
          { x: event.clientX, y: event.clientY },
        );
        if (consumed === true) {
          event.stopImmediatePropagation();
          const pointerId = event.pointerId;
          const onMove = (moveEvent: FederatedPointerEvent) => {
            if (moveEvent.pointerId !== pointerId) {
              return;
            }
            this.host.onWorldPointerMove?.(
              this.clientToWorld(moveEvent.clientX, moveEvent.clientY),
            );
          };
          const onUp = (upEvent: FederatedPointerEvent) => {
            if (upEvent.pointerId !== pointerId) {
              return;
            }
            app.stage.removeEventListener("pointermove", onMove);
            app.stage.removeEventListener("pointerup", onUp);
            app.stage.removeEventListener("pointerupoutside", onUp);
            this.host.onWorldPointerUp?.(
              this.clientToWorld(upEvent.clientX, upEvent.clientY),
            );
          };
          app.stage.addEventListener("pointermove", onMove);
          app.stage.addEventListener("pointerup", onUp);
          app.stage.addEventListener("pointerupoutside", onUp);
          return;
        }
        if (event.target === app.stage) {
          this.host.onBackgroundPointerDown();
        }
      },
      { capture: true },
    );
    app.renderer.on("resize", () => {
      this.fillDesignCanvasCss();
      this.host.onResize();
    });
    this.parentResizeObserver = new ResizeObserver(() => {
      if (this.host.designResolution) {
        this.scheduleDesignBufferSync();
        return;
      }
      app.queueResize();
    });
    this.parentResizeObserver.observe(this.host.canvasParent);
    if (design) {
      this.syncDesignBufferToParent();
    } else {
      this.syncViewportSize();
    }
    app.ticker.add((ticker) => {
      this.host.onTick?.(ticker);
    });
    if (this.tickerPaused) {
      app.ticker.stop();
    }
    this.ready = true;
  }

  setTickerPaused(paused: boolean): void {
    this.tickerPaused = paused;
    const app = this.app;
    if (!app) {
      return;
    }
    if (paused) {
      app.ticker.stop();
      return;
    }
    app.ticker.start();
  }

  /** Present the current stage without advancing the ticker. */
  renderFrame(): void {
    this.app?.render();
  }

  syncViewportSize(): void {
    const app = this.app;
    if (!app) {
      return;
    }
    this.width = app.screen.width;
    this.height = app.screen.height;
    app.stage.hitArea = app.screen;
  }

  /**
   * Apply editor/runtime resize. When `designResolution` is set, the buffer
   * expands to fill the parent (design stays centered; extra space is Pixi).
   */
  resize(width: number, height: number): void {
    const design = this.host.designResolution;
    if (design) {
      this.syncDesignBufferToParent();
      return;
    }
    this.width = width;
    this.height = height;
  }

  /**
   * Pixi `renderer.resize` writes inline canvas CSS in backbuffer pixels.
   * Playback needs the bitmap stretched across the parent so the 1920×1080
   * design stays fully visible and centered inside expand/contain/cover.
   * Pin to the parent CSS box so Android WebView cannot expand the layout
   * viewport (portrait scale would then be computed against 1920px width).
   */
  private fillDesignCanvasCss(): void {
    const canvas = this.app?.canvas;
    if (!canvas || !this.host.designResolution) {
      return;
    }
    applyPlaybackCanvasLayout(canvas, this.host.canvasParent);
  }

  /** Coalesce parent resizes to one buffer sync per frame (avoids clear-flash spam). */
  private scheduleDesignBufferSync(): void {
    if (this.designFitRafId !== 0) {
      return;
    }
    this.designFitRafId = requestAnimationFrame(() => {
      this.designFitRafId = 0;
      this.syncDesignBufferToParent();
    });
  }

  private syncDesignBufferToParent(): void {
    const design = this.host.designResolution;
    const app = this.app;
    if (!design || !app) {
      return;
    }
    const parent = this.host.canvasParent;
    const measured = measurePlaybackParentSize(parent);
    if (measured.width < 1 || measured.height < 1) {
      return;
    }
    const next = playbackCameraForParent(design, measured);
    const sizeChanged =
      app.screen.width !== next.width || app.screen.height !== next.height;
    if (sizeChanged) {
      app.renderer.resize(next.width, next.height);
    }
    this.fillDesignCanvasCss();
    this.width = next.width;
    this.height = next.height;
    app.stage.hitArea = app.screen;
    const camera = this.host.camera.getState();
    const cameraChanged =
      camera.pan.x !== next.panX ||
      camera.pan.y !== next.panY ||
      camera.scale !== next.scale;
    if (cameraChanged) {
      this.host.camera.applyExternalState({
        pan: { x: next.panX, y: next.panY },
        scale: next.scale,
      });
    }
    // renderer.resize clears the drawing buffer; paint now so we don't flash
    // empty until the next game rAF (same as ThreeSceneRenderer.resize).
    if (sizeChanged || cameraChanged) {
      this.renderFrame();
    }
  }

  async destroy(): Promise<void> {
    await this.initPromise;
    if (this.designFitRafId !== 0) {
      cancelAnimationFrame(this.designFitRafId);
      this.designFitRafId = 0;
    }
    this.parentResizeObserver?.disconnect();
    this.parentResizeObserver = undefined;
    this.host.camera.detach();
    const destroyedApp = this.app;
    // First arg is rendererDestroyOptions. Boolean `true` means
    // releaseGlobalResources and clears Pixi's shared TexturePool —
    // which breaks any other live Application (Scene + Preview).
    this.app?.destroy({ removeView: true }, { children: true });
    this.app = undefined;
    clearPublishedPixiApp(destroyedApp);
    this.ready = false;
  }
}
