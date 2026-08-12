import { createId } from "@game-editor/shared";
import type { SpineComponentData } from "../types.js";
import { DEFAULT_SPINE_TIME_SCALE } from "../defaults.js";

export function createSpineComponent(
  partial?: Partial<Omit<SpineComponentData, "type" | "id">> & { id?: string },
): SpineComponentData {
  const data: SpineComponentData = {
    type: "Spine",
    id: partial?.id ?? createId("comp"),
    loop: partial?.loop ?? true,
    timeScale: partial?.timeScale ?? DEFAULT_SPINE_TIME_SCALE,
    playing: partial?.playing ?? true,
  };
  if (partial?.assetId !== undefined) {
    data.assetId = partial.assetId;
  }
  if (partial?.skin !== undefined) {
    data.skin = partial.skin;
  }
  if (partial?.animation !== undefined) {
    data.animation = partial.animation;
  }
  return data;
}
