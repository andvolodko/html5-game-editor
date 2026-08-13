import type { SceneRenderStats } from "@game-editor/scene";
import type { Object3D, WebGLRenderer } from "three";

const DEFAULT_CANVAS_COUNT = 1;

/**
 * Sample draw-call / triangle counts from Three's last `render()`,
 * plus Object3Ds in the submitted scene graph.
 */
export function sampleThreeRenderStats(
  renderer: WebGLRenderer | undefined,
  root: Object3D,
): SceneRenderStats {
  const info = renderer?.info.render;
  return {
    drawCalls: info?.calls ?? 0,
    triangles: info?.triangles ?? 0,
    canvas: renderer ? DEFAULT_CANVAS_COUNT : 0,
    displayObjects: countObject3Ds(root),
  };
}

/** Counts every Object3D in the subtree, including the root. */
export function countObject3Ds(root: Object3D): number {
  let count = 0;
  const stack: Object3D[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) {
      continue;
    }
    count += 1;
    const children = node.children;
    for (let i = 0; i < children.length; i += 1) {
      const child = children[i];
      if (child) {
        stack.push(child);
      }
    }
  }
  return count;
}
