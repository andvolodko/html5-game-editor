import {
  aff2FromPose,
  transformLocalAabb,
  unionLocalAabb,
} from "@game-editor/scene";
import type { Container } from "pixi.js";
import type { PixiRuntimeGraph, RuntimeNode } from "./pixi-runtime-nodes.js";
import type { VisualBounds } from "./visuals/types.js";

const RADIANS_TO_DEGREES = 180 / Math.PI;

/** Union of direct children's visual AABBs in the parent's local space. */
export function computeGroupingContentBounds(
  runtime: RuntimeNode,
  graph: PixiRuntimeGraph,
): VisualBounds | undefined {
  const boxes: VisualBounds[] = [];
  for (const child of graph.listDirectChildren(runtime.node.id)) {
    if (!child.container.visible) {
      continue;
    }
    const local = child.visualBounds;
    if (!local || local.width <= 0 || local.height <= 0) {
      continue;
    }
    boxes.push(transformLocalAabb(local, aff2FromContainer(child.container)));
  }
  return unionLocalAabb(boxes);
}

function aff2FromContainer(container: Container) {
  return aff2FromPose(
    { x: container.position.x, y: container.position.y },
    container.rotation * RADIANS_TO_DEGREES,
    { x: container.scale.x, y: container.scale.y },
  );
}
