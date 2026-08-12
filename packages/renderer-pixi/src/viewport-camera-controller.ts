import type { Application } from "pixi.js";
import { Container } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import type { Vec2 } from "@game-editor/scene";
import { MOUSE_BUTTON_MIDDLE } from "@game-editor/shared";
import {
  createDefaultViewportCamera,
  panByScreenDelta,
  type ViewportCameraState,
  VIEWPORT_SCALE_STEP,
  zoomAtScreenPoint,
} from "./viewport-camera.js";

export type ViewportCameraListener = (state: ViewportCameraState) => void;

/**
 * Editor preview camera: pan (middle-mouse drag) + scale.
 * Preview-only — never written to scene documents.
 */
export class ViewportCameraController {
  readonly root = new Container();
  private state: ViewportCameraState = createDefaultViewportCamera();
  private panDrag:
    | { pointerId: number; lastX: number; lastY: number }
    | undefined;
  private listeners = new Set<ViewportCameraListener>();
  private app: Application | undefined;
  private unbind: (() => void) | undefined;

  constructor() {
    this.root.label = "viewport-camera";
    this.root.eventMode = "passive";
    this.applyTransform();
  }

  getState(): Readonly<ViewportCameraState> {
    return this.state;
  }

  subscribe(listener: ViewportCameraListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  attach(app: Application): void {
    this.detach();
    this.app = app;
    const stage = app.stage;

    const onPointerDown = (event: FederatedPointerEvent) => {
      // Middle mouse (wheel button) drag pans the preview camera.
      if (event.button !== MOUSE_BUTTON_MIDDLE) {
        return;
      }
      event.stopPropagation();
      this.panDrag = {
        pointerId: event.pointerId,
        lastX: event.global.x,
        lastY: event.global.y,
      };
      stage.cursor = "grabbing";
    };

    const onPointerMove = (event: FederatedPointerEvent) => {
      if (!this.panDrag || event.pointerId !== this.panDrag.pointerId) {
        return;
      }
      const dx = event.global.x - this.panDrag.lastX;
      const dy = event.global.y - this.panDrag.lastY;
      this.panDrag.lastX = event.global.x;
      this.panDrag.lastY = event.global.y;
      this.setState(panByScreenDelta(this.state, { x: dx, y: dy }));
    };

    const onPointerUp = (event: FederatedPointerEvent) => {
      if (!this.panDrag || event.pointerId !== this.panDrag.pointerId) {
        return;
      }
      this.panDrag = undefined;
      stage.cursor = "default";
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const canvas = app.canvas;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }
      const screen: Vec2 = {
        x: ((event.clientX - rect.left) / rect.width) * app.screen.width,
        y: ((event.clientY - rect.top) / rect.height) * app.screen.height,
      };
      const direction = event.deltaY < 0 ? 1 : -1;
      const nextScale =
        this.state.scale * (1 + direction * VIEWPORT_SCALE_STEP);
      this.setState(zoomAtScreenPoint(this.state, nextScale, screen));
    };

    stage.on("pointerdown", onPointerDown);
    stage.on("pointermove", onPointerMove);
    stage.on("pointerup", onPointerUp);
    stage.on("pointerupoutside", onPointerUp);
    app.canvas.addEventListener("wheel", onWheel, { passive: false });
    // Avoid the browser auto-scrolling / middle-click autoscroll gesture.
    app.canvas.addEventListener("auxclick", preventDefault);
    app.canvas.addEventListener("mousedown", preventMiddleDefault);

    this.unbind = () => {
      stage.off("pointerdown", onPointerDown);
      stage.off("pointermove", onPointerMove);
      stage.off("pointerup", onPointerUp);
      stage.off("pointerupoutside", onPointerUp);
      app.canvas.removeEventListener("wheel", onWheel);
      app.canvas.removeEventListener("auxclick", preventDefault);
      app.canvas.removeEventListener("mousedown", preventMiddleDefault);
    };
  }

  detach(): void {
    this.unbind?.();
    this.unbind = undefined;
    this.app = undefined;
    this.panDrag = undefined;
  }

  setScale(scale: number, anchorScreen?: Vec2): void {
    const app = this.app;
    const anchor =
      anchorScreen ??
      (app
        ? { x: app.screen.width / 2, y: app.screen.height / 2 }
        : { x: 0, y: 0 });
    this.setState(zoomAtScreenPoint(this.state, scale, anchor));
  }

  setPan(pan: Vec2): void {
    this.setState({ ...this.state, pan: { ...pan } });
  }

  reset(): void {
    this.setState(createDefaultViewportCamera());
  }

  /**
   * Copy camera from another layer without notifying listeners
   * (avoids hybrid bg↔fg sync feedback).
   */
  applyExternalState(state: Readonly<ViewportCameraState>): void {
    this.state = {
      pan: { x: state.pan.x, y: state.pan.y },
      scale: state.scale,
    };
    this.applyTransform();
  }

  private setState(next: ViewportCameraState): void {
    this.state = next;
    this.applyTransform();
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private applyTransform(): void {
    this.root.position.set(this.state.pan.x, this.state.pan.y);
    this.root.scale.set(this.state.scale);
  }
}

function preventDefault(event: Event): void {
  event.preventDefault();
}

function preventMiddleDefault(event: MouseEvent): void {
  if (event.button === MOUSE_BUTTON_MIDDLE) {
    event.preventDefault();
  }
}
