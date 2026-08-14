import { createId } from "@game-editor/shared";
import type {
  AnimatedSpriteComponentData,
  NineSliceSpriteComponentData,
  SpriteComponentData,
  TilingSpriteComponentData,
} from "../types.js";
import {
  DEFAULT_NINE_SLICE_BORDER,
  DEFAULT_NINE_SLICE_HEIGHT,
  DEFAULT_NINE_SLICE_WIDTH,
  DEFAULT_SPRITE_SIZE,
  DEFAULT_TILING_SPRITE_SIZE,
} from "../defaults.js";

export function createSpriteComponent(
  partial?: Partial<Omit<SpriteComponentData, "type" | "id">> & { id?: string },
): SpriteComponentData {
  const sprite: SpriteComponentData = {
    type: "Sprite",
    id: partial?.id ?? createId("comp"),
    width: partial?.width ?? DEFAULT_SPRITE_SIZE,
    height: partial?.height ?? DEFAULT_SPRITE_SIZE,
  };

  if (partial?.assetId !== undefined) {
    sprite.assetId = partial.assetId;
  }
  if (partial?.tint !== undefined) {
    sprite.tint = partial.tint;
  }
  if (partial?.anchor !== undefined) {
    sprite.anchor = { ...partial.anchor };
  }

  return sprite;
}

export function createNineSliceSpriteComponent(
  partial?: Partial<Omit<NineSliceSpriteComponentData, "type" | "id">> & {
    id?: string;
  },
): NineSliceSpriteComponentData {
  const data: NineSliceSpriteComponentData = {
    type: "NineSliceSprite",
    id: partial?.id ?? createId("comp"),
    width: partial?.width ?? DEFAULT_NINE_SLICE_WIDTH,
    height: partial?.height ?? DEFAULT_NINE_SLICE_HEIGHT,
    leftWidth: partial?.leftWidth ?? DEFAULT_NINE_SLICE_BORDER,
    rightWidth: partial?.rightWidth ?? DEFAULT_NINE_SLICE_BORDER,
    topHeight: partial?.topHeight ?? DEFAULT_NINE_SLICE_BORDER,
    bottomHeight: partial?.bottomHeight ?? DEFAULT_NINE_SLICE_BORDER,
  };
  if (partial?.assetId !== undefined) {
    data.assetId = partial.assetId;
  }
  if (partial?.tint !== undefined) {
    data.tint = partial.tint;
  }
  return data;
}

export function createTilingSpriteComponent(
  partial?: Partial<Omit<TilingSpriteComponentData, "type" | "id">> & {
    id?: string;
  },
): TilingSpriteComponentData {
  const data: TilingSpriteComponentData = {
    type: "TilingSprite",
    id: partial?.id ?? createId("comp"),
    width: partial?.width ?? DEFAULT_TILING_SPRITE_SIZE,
    height: partial?.height ?? DEFAULT_TILING_SPRITE_SIZE,
    tilePosition: partial?.tilePosition
      ? { ...partial.tilePosition }
      : { x: 0, y: 0 },
    tileScale: partial?.tileScale ? { ...partial.tileScale } : { x: 1, y: 1 },
    tileRotation: partial?.tileRotation ?? 0,
  };
  if (partial?.assetId !== undefined) {
    data.assetId = partial.assetId;
  }
  if (partial?.tint !== undefined) {
    data.tint = partial.tint;
  }
  if (partial?.anchor !== undefined) {
    data.anchor = { ...partial.anchor };
  }
  return data;
}

export function createAnimatedSpriteComponent(
  partial?: Partial<Omit<AnimatedSpriteComponentData, "type" | "id">> & {
    id?: string;
  },
): AnimatedSpriteComponentData {
  const data: AnimatedSpriteComponentData = {
    type: "AnimatedSprite",
    id: partial?.id ?? createId("comp"),
    frames: partial?.frames ? [...partial.frames] : [],
    animationSpeed: partial?.animationSpeed ?? 1,
    loop: partial?.loop ?? true,
    playing: partial?.playing ?? false,
  };
  if (partial?.assetId !== undefined) {
    data.assetId = partial.assetId;
  }
  if (partial?.animation !== undefined) {
    data.animation = partial.animation;
  }
  if (partial?.anchor !== undefined) {
    data.anchor = { ...partial.anchor };
  }
  if (partial?.tint !== undefined) {
    data.tint = partial.tint;
  }
  if (partial?.width !== undefined) {
    data.width = partial.width;
  }
  if (partial?.height !== undefined) {
    data.height = partial.height;
  }
  return data;
}
