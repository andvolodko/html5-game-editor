import type {
  ScriptModel3DPlayback,
  ScriptModel3DPlaybackPatch,
  ScriptTransform2D,
  ScriptTransform2DPatch,
  ScriptTransform3D,
  ScriptTransform3DPatch,
} from "@game-editor/game-components";
import {
  findNodeById,
  getBitmapText,
  getHTMLText,
  getModel3D,
  getSprite,
  getText,
  getTransform2D,
  getTransform3D,
  type SceneData,
  type SceneNodeData,
} from "@game-editor/scene";

function cloneVec3(value: {
  x: number;
  y: number;
  z: number;
}): { x: number; y: number; z: number } {
  return { x: value.x, y: value.y, z: value.z };
}

export function readTransform2D(
  scene: SceneData | undefined,
  nodeId: string,
): ScriptTransform2D | undefined {
  const node = scene ? findNodeById(scene, nodeId) : undefined;
  const transform = node ? getTransform2D(node) : undefined;
  if (!transform) {
    return undefined;
  }
  return {
    position: { ...transform.position },
    rotation: transform.rotation,
    scale: { ...transform.scale },
    skew: transform.skew ? { ...transform.skew } : { x: 0, y: 0 },
  };
}

export function patchTransform2D(
  scene: SceneData | undefined,
  nodeId: string,
  patch: ScriptTransform2DPatch,
): SceneNodeData | undefined {
  const node = scene ? findNodeById(scene, nodeId) : undefined;
  const transform = node ? getTransform2D(node) : undefined;
  if (!node || !transform) {
    return undefined;
  }
  if (patch.position) {
    transform.position = { ...patch.position };
  }
  if (patch.rotation !== undefined) {
    transform.rotation = patch.rotation;
  }
  if (patch.scale) {
    transform.scale = { ...patch.scale };
  }
  if (patch.skew) {
    if (patch.skew.x === 0 && patch.skew.y === 0) {
      delete transform.skew;
    } else {
      transform.skew = { ...patch.skew };
    }
  }
  return node;
}

export function readTransform3D(
  scene: SceneData | undefined,
  nodeId: string,
): ScriptTransform3D | undefined {
  const node = scene ? findNodeById(scene, nodeId) : undefined;
  const transform = node ? getTransform3D(node) : undefined;
  if (!transform) {
    return undefined;
  }
  return {
    position: cloneVec3(transform.position),
    rotation: cloneVec3(transform.rotation),
    scale: cloneVec3(transform.scale),
  };
}

export function patchTransform3D(
  scene: SceneData | undefined,
  nodeId: string,
  patch: ScriptTransform3DPatch,
): SceneNodeData | undefined {
  const node = scene ? findNodeById(scene, nodeId) : undefined;
  const transform = node ? getTransform3D(node) : undefined;
  if (!node || !transform) {
    return undefined;
  }
  if (patch.position) {
    transform.position = cloneVec3(patch.position);
  }
  if (patch.rotation) {
    transform.rotation = cloneVec3(patch.rotation);
  }
  if (patch.scale) {
    transform.scale = cloneVec3(patch.scale);
  }
  return node;
}

export function readModel3DPlayback(
  scene: SceneData | undefined,
  nodeId: string,
): ScriptModel3DPlayback | undefined {
  const node = scene ? findNodeById(scene, nodeId) : undefined;
  const model = node ? getModel3D(node) : undefined;
  if (!model) {
    return undefined;
  }
  const playback: ScriptModel3DPlayback = {
    loop: model.loop,
    timeScale: model.timeScale,
    playing: model.playing,
  };
  if (model.assetId !== undefined) {
    playback.assetId = model.assetId;
  }
  if (model.animation !== undefined) {
    playback.animation = model.animation;
  }
  return playback;
}

export function patchModel3DPlayback(
  scene: SceneData | undefined,
  nodeId: string,
  patch: ScriptModel3DPlaybackPatch,
): SceneNodeData | undefined {
  const node = scene ? findNodeById(scene, nodeId) : undefined;
  const model = node ? getModel3D(node) : undefined;
  if (!node || !model) {
    return undefined;
  }
  if (patch.animation !== undefined) {
    if (patch.animation.length === 0) {
      delete model.animation;
    } else {
      model.animation = patch.animation;
    }
  }
  if (patch.loop !== undefined) {
    model.loop = patch.loop;
  }
  if (patch.timeScale !== undefined) {
    model.timeScale = patch.timeScale;
  }
  if (patch.playing !== undefined) {
    model.playing = patch.playing;
  }
  return node;
}

export function patchNodeText(
  scene: SceneData | undefined,
  nodeId: string,
  text: string,
): SceneNodeData | undefined {
  const node = scene ? findNodeById(scene, nodeId) : undefined;
  if (!node) {
    return undefined;
  }
  const textComp = getText(node) ?? getHTMLText(node) ?? getBitmapText(node);
  if (!textComp) {
    return undefined;
  }
  textComp.text = text;
  return node;
}

export function patchSpriteAssetId(
  scene: SceneData | undefined,
  nodeId: string,
  assetId: string,
): SceneNodeData | undefined {
  const node = scene ? findNodeById(scene, nodeId) : undefined;
  const sprite = node ? getSprite(node) : undefined;
  if (!node || !sprite) {
    return undefined;
  }
  if (assetId.length === 0) {
    delete sprite.assetId;
  } else {
    sprite.assetId = assetId;
  }
  return node;
}
