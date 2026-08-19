import type { Application, Container } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import { MOUSE_BUTTON_MIDDLE } from "@game-editor/shared";
import type { RuntimeNode } from "./pixi-runtime-nodes.js";
import { POINTER_CLICK_MAX_MOVE_PX } from "./pixi-pointer-constants.js";

/** Playback pointer events emitted to the host (mirrors script NodePointerEventName). */
export type PlaybackPointerEventName =
  | "pointerdown"
  | "pointerup"
  | "pointertap"
  | "pointerover"
  | "pointerout";

export interface NodeClickHost {
  getApp(): Application | undefined;
  onNodeClick?(nodeId: string): void;
  onNodePointerEvent?(nodeId: string, event: PlaybackPointerEventName): void;
}

/**
 * Playback pointer events for non-editable nodes.
 * `pointertap` uses press+release without drag (same as legacy onNodeClick).
 */
export class PixiNodeClickController {
  private readonly boundTargets = new WeakSet<Container>();

  attach(runtime: RuntimeNode, host: NodeClickHost): void {
    this.bindTarget(runtime.visualsRoot, runtime.node.id, host);
  }

  /** Playback HitZone `hitTarget` is a dedicated child; bind it without double-firing. */
  attachHitTarget(runtime: RuntimeNode, host: NodeClickHost): void {
    const target = runtime.hitZoneTarget;
    if (!target) {
      return;
    }
    this.bindTarget(target, runtime.node.id, host);
  }

  private bindTarget(
    target: Container,
    nodeId: string,
    host: NodeClickHost,
  ): void {
    if (this.boundTargets.has(target)) {
      return;
    }
    this.boundTargets.add(target);

    const emit = (event: PlaybackPointerEventName): void => {
      host.onNodePointerEvent?.(nodeId, event);
      if (event === "pointertap") {
        host.onNodeClick?.(nodeId);
      }
    };

    target.on("pointerdown", (event: FederatedPointerEvent) => {
      if (event.button === MOUSE_BUTTON_MIDDLE) {
        return;
      }
      event.stopPropagation();
      emit("pointerdown");

      const pointerId = event.pointerId;
      const startX = event.global.x;
      const startY = event.global.y;

      const app = host.getApp();
      if (!app) {
        return;
      }

      const onUp = (upEvent: FederatedPointerEvent) => {
        if (upEvent.pointerId !== pointerId) {
          return;
        }
        appOff();
        emit("pointerup");
        const dx = upEvent.global.x - startX;
        const dy = upEvent.global.y - startY;
        if (
          dx * dx + dy * dy >
          POINTER_CLICK_MAX_MOVE_PX * POINTER_CLICK_MAX_MOVE_PX
        ) {
          return;
        }
        emit("pointertap");
      };

      const appOff = () => {
        app.stage.off("pointerup", onUp);
        app.stage.off("pointerupoutside", onUp);
      };

      app.stage.on("pointerup", onUp);
      app.stage.on("pointerupoutside", onUp);
    });

    target.on("pointerover", () => {
      emit("pointerover");
    });
    target.on("pointerout", () => {
      emit("pointerout");
    });
  }
}
