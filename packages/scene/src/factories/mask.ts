import { createId } from "@game-editor/shared";
import type { MaskComponentData } from "../mask-component.js";
import type { SceneNodeData, Vec2 } from "../types.js";
import { DEFAULT_NODE_SPAWN_POSITION } from "../defaults.js";
import { defaultHitZoneShapeFromVisual } from "../hit-zone-math.js";
import { getVisualComponent } from "../queries.js";
import { createTransform2D } from "./scene.js";

export function createMaskComponent(
  partial?: Partial<Omit<MaskComponentData, "type" | "id">> & { id?: string },
): MaskComponentData {
  const mode = partial?.mode ?? "shape";
  const data: MaskComponentData = {
    type: "Mask",
    id: partial?.id ?? createId("comp"),
    mode,
  };
  if (partial?.enabled === false) {
    data.enabled = false;
  }
  if (partial?.inverse === true) {
    data.inverse = true;
  }
  if (
    partial?.offset !== undefined &&
    (partial.offset.x !== 0 || partial.offset.y !== 0)
  ) {
    data.offset = { ...partial.offset };
  }
  if (mode === "shape") {
    data.shape = partial?.shape ?? defaultHitZoneShapeFromVisual(undefined);
  } else {
    if (partial?.assetId) {
      data.assetId = partial.assetId;
    }
    if (partial?.width !== undefined && partial.width > 0) {
      data.width = partial.width;
    }
    if (partial?.height !== undefined && partial.height > 0) {
      data.height = partial.height;
    }
  }
  return data;
}

export function defaultMaskShapeForNode(node: SceneNodeData) {
  return defaultHitZoneShapeFromVisual(getVisualComponent(node));
}

/** Transform2D + Mask node (clip container; may have children). */
export function createMaskNode(
  name = "Mask",
  position: Vec2 = { ...DEFAULT_NODE_SPAWN_POSITION },
  parentId?: string,
): SceneNodeData {
  const node: SceneNodeData = {
    id: createId("node"),
    name,
    components: [createTransform2D({ position }), createMaskComponent()],
    children: [],
  };
  if (parentId !== undefined) {
    node.parentId = parentId;
  }
  return node;
}
