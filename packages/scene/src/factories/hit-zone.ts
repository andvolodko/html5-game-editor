import { createId } from "@game-editor/shared";
import type { HitZoneComponentData } from "../hit-zone-component.js";
import type { GraphicsShapeData } from "../visual-components.js";
import type { SceneNodeData, Vec2 } from "../types.js";
import { DEFAULT_NODE_SPAWN_POSITION } from "../defaults.js";
import {
  defaultGraphicsShape,
  defaultHitZoneShapeFromVisual,
} from "../hit-zone-math.js";
import { getVisualComponent } from "../queries.js";
import { createTransform2D } from "./scene.js";

export function createHitZoneComponent(
  partial?: Partial<Omit<HitZoneComponentData, "type" | "id">> & { id?: string },
): HitZoneComponentData {
  const data: HitZoneComponentData = {
    type: "HitZone",
    id: partial?.id ?? createId("comp"),
    shape: partial?.shape ?? defaultGraphicsShape("rectangle"),
  };
  if (partial?.enabled === false) {
    data.enabled = false;
  }
  if (
    partial?.offset !== undefined &&
    (partial.offset.x !== 0 || partial.offset.y !== 0)
  ) {
    data.offset = { ...partial.offset };
  }
  return data;
}

export function defaultHitZoneShapeForNode(
  node: SceneNodeData,
): GraphicsShapeData {
  return defaultHitZoneShapeFromVisual(getVisualComponent(node));
}

/** Transform2D + HitZone node (empty click target; may have children). */
export function createHitZoneNode(
  name = "Hit Zone",
  position: Vec2 = { ...DEFAULT_NODE_SPAWN_POSITION },
  parentId?: string,
): SceneNodeData {
  const node: SceneNodeData = {
    id: createId("node"),
    name,
    components: [
      createTransform2D({ position }),
      createHitZoneComponent(),
    ],
    children: [],
  };
  if (parentId !== undefined) {
    node.parentId = parentId;
  }
  return node;
}
