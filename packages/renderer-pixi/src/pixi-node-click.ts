import type { Application } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import { MOUSE_BUTTON_MIDDLE } from "@game-editor/shared";
import type { RuntimeNode } from "./pixi-runtime-nodes.js";

/** Max screen-space movement (px) still counted as a click, not a drag. */
const CLICK_MAX_MOVE_PX = 8;

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
  attach(runtime: RuntimeNode, host: NodeClickHost): void {
    const nodeId = runtime.node.id;
    const root = runtime.visualsRoot;

    const emit = (event: PlaybackPointerEventName): void => {
      host.onNodePointerEvent?.(nodeId, event);
      if (event === "pointertap") {
        host.onNodeClick?.(nodeId);
      }
    };

    root.on("pointerdown", (event: FederatedPointerEvent) => {
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
        if (dx * dx + dy * dy > CLICK_MAX_MOVE_PX * CLICK_MAX_MOVE_PX) {
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

    root.on("pointerover", () => {
      emit("pointerover");
    });
    root.on("pointerout", () => {
      emit("pointerout");
    });
  }
}
