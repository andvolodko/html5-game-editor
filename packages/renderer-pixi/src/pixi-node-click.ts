import type { Application } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import { MOUSE_BUTTON_MIDDLE } from "@game-editor/shared";
import type { RuntimeNode } from "./pixi-runtime-nodes.js";

/** Max screen-space movement (px) still counted as a click, not a drag. */
const CLICK_MAX_MOVE_PX = 8;

export interface NodeClickHost {
  getApp(): Application | undefined;
  onNodeClick?(nodeId: string): void;
}

/**
 * Playback pointer click for non-editable nodes.
 * Does not move nodes — only reports a click when press+release stay close.
 */
export class PixiNodeClickController {
  attach(runtime: RuntimeNode, host: NodeClickHost): void {
    const nodeId = runtime.node.id;
    runtime.visualsRoot.on("pointerdown", (event: FederatedPointerEvent) => {
      if (event.button === MOUSE_BUTTON_MIDDLE) {
        return;
      }
      event.stopPropagation();

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
        const dx = upEvent.global.x - startX;
        const dy = upEvent.global.y - startY;
        if (dx * dx + dy * dy > CLICK_MAX_MOVE_PX * CLICK_MAX_MOVE_PX) {
          return;
        }
        host.onNodeClick?.(nodeId);
      };

      const appOff = () => {
        app.stage.off("pointerup", onUp);
        app.stage.off("pointerupoutside", onUp);
      };

      app.stage.on("pointerup", onUp);
      app.stage.on("pointerupoutside", onUp);
    });
  }
}
