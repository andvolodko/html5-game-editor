import { PerspectiveCamera } from "three";
import type { ThreeRuntimeGraph } from "./three-runtime-nodes.js";

/**
 * Resolves which PerspectiveCamera draws the frame.
 * - preferEditor: free orbit camera (Scene editing)
 * - otherwise: scene `active` camera, else first PerspectiveCamera, else editor
 */
export function resolveActiveCamera(args: {
  preferEditor: boolean;
  editorCamera: PerspectiveCamera | undefined;
  graph: ThreeRuntimeGraph;
}): PerspectiveCamera {
  const { preferEditor, editorCamera, graph } = args;
  if (preferEditor && editorCamera) {
    return editorCamera;
  }
  let first: PerspectiveCamera | undefined;
  for (const [, entry] of graph.entries()) {
    if (
      entry.kind !== "PerspectiveCamera" ||
      !(entry.object instanceof PerspectiveCamera)
    ) {
      continue;
    }
    if (entry.cameraActive) {
      return entry.object;
    }
    if (!first) {
      first = entry.object;
    }
  }
  return first ?? editorCamera!;
}
