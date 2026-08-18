import {
  getMask,
  isMaskEnabled,
  type MaskComponentData,
} from "@game-editor/scene";
import type { RuntimeNode } from "./pixi-runtime-nodes.js";

export function sceneMask(runtime: RuntimeNode): MaskComponentData | undefined {
  return runtime.maskPreview ?? getMask(runtime.node);
}

export function effectiveMask(
  runtime: RuntimeNode,
): MaskComponentData | undefined {
  const mask = sceneMask(runtime);
  if (!mask || !isMaskEnabled(mask)) {
    return undefined;
  }
  return mask;
}
