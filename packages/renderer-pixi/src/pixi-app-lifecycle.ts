import { Application } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import { MOUSE_BUTTON_MIDDLE } from "@game-editor/shared";
import type { Vec2 } from "@game-editor/scene";
import { clientPointToWorld } from "./viewport-math.js";
import type { ViewportCameraController } from "./viewport-camera-controller.js";
import type { PixiRuntimeGraph } from "./pixi-runtime-nodes.js";
import type { PixelGridOverlay } from "./pixel-grid.js";
import type { ScreenGuidesOverlay } from "./screen-guides.js";

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
  onBackgroundPointerDown(): void;
  onWorldPointerDown?(world: Vec2, button: number): boolean;
  onWorldPointerMove?(world: Vec2): void;
  onWorldPointerUp?(world: Vec2): void;
  onResize(): void;
  onTick?(deltaMs: number): void;
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
  private readonly initPromise: Promise<void>;

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
    await app.init({
      background: this.host.background,
      backgroundAlpha: this.host.backgroundAlpha,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      ...(design
        ? { width: design.width, height: design.height }
        : { resizeTo: this.host.canvasParent }),
    });
    this.app = app;
    publishPixiApp(app);
    app.stage.label = "stage";
    this.host.canvasParent.appendChild(app.canvas);
    if (design) {
      // Stretch the fixed design buffer across the letterboxed parent.
      app.canvas.style.width = "100%";
      app.canvas.style.height = "100%";
      app.canvas.style.display = "block";
    }
    if (this.host.pixelGrid) {
      this.host.camera.root.addChild(this.host.pixelGrid.root);
    }
    if (this.host.screenGuides) {
      this.host.camera.root.addChild(this.host.screenGuides.root);
    }
    this.host.camera.root.addChild(this.host.graph.world);
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
        const consumed = this.host.onWorldPointerDown?.(world, event.button);
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
      this.host.onResize();
    });
    if (!design) {
      // Keep buffer CSS-pixel size in sync with the host (no CSS bitmap stretch).
      this.parentResizeObserver = new ResizeObserver(() => {
        app.queueResize();
      });
      this.parentResizeObserver.observe(this.host.canvasParent);
    }
    this.syncViewportSize();
    app.ticker.add((ticker) => {
      this.host.onTick?.(ticker.deltaMS);
    });
    this.ready = true;
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
   * Apply editor/runtime resize. Returns whether overlays should redraw.
   * When `designResolution` is set, buffer size stays fixed.
   */
  resize(width: number, height: number): void {
    const design = this.host.designResolution;
    if (design) {
      this.width = design.width;
      this.height = design.height;
      const app = this.app;
      if (
        app &&
        (app.screen.width !== design.width ||
          app.screen.height !== design.height)
      ) {
        app.renderer.resize(design.width, design.height);
      }
      return;
    }
    this.width = width;
    this.height = height;
  }

  async destroy(): Promise<void> {
    await this.initPromise;
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
