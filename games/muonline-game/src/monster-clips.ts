import type { ComponentDefinition } from "@game-editor/game-components";
import {
  MU_ACTION_DIE,
  MU_ACTION_FIGHT,
  MU_ACTION_SHOCK,
  MU_ACTION_STAY,
  MU_ACTION_WALK,
  actionClipName,
} from "./action-clips.js";

export interface MonsterClipProps {
  idleAnimation: string;
  walkAnimation: string;
  attackAnimation: string;
  dieAnimation: string;
  receiveKickAnimation: string;
}

function readClip(
  raw: Readonly<Record<string, unknown>>,
  key: keyof MonsterClipProps,
): string {
  const value = raw[key];
  return typeof value === "string" ? value.trim() : "";
}

export function readMonsterClipProps(
  raw: Readonly<Record<string, unknown>>,
): MonsterClipProps {
  return {
    idleAnimation: readClip(raw, "idleAnimation"),
    walkAnimation: readClip(raw, "walkAnimation"),
    attackAnimation: readClip(raw, "attackAnimation"),
    dieAnimation: readClip(raw, "dieAnimation"),
    receiveKickAnimation: readClip(raw, "receiveKickAnimation"),
  };
}

export function resolveMonsterClip(
  names: readonly string[],
  selected: string,
  fallbackIndex: number,
): string | undefined {
  if (selected.length > 0) {
    return selected;
  }
  return actionClipName(names, fallbackIndex);
}

function clipField(): ComponentDefinition["properties"][string] {
  return {
    kind: "dynamicEnum",
    default: "",
    source: "gltfAnimations",
  };
}

export const MONSTER_CLIP_PROPERTIES: ComponentDefinition["properties"] = {
  idleAnimation: clipField(),
  walkAnimation: clipField(),
  attackAnimation: clipField(),
  dieAnimation: clipField(),
  receiveKickAnimation: clipField(),
};

export const MONSTER_CLIP_FALLBACKS = {
  idleAnimation: MU_ACTION_STAY,
  walkAnimation: MU_ACTION_WALK,
  attackAnimation: MU_ACTION_FIGHT,
  dieAnimation: MU_ACTION_DIE,
  receiveKickAnimation: MU_ACTION_SHOCK,
} as const;
