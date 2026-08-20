import { CompositeCommand } from "@game-editor/commands";
import type { Editor, Transform2DPatch, Transform3DPatch } from "@game-editor/editor-core";
import {
  SetTransform2DCommand,
  SetVisualComponentCommand,
} from "@game-editor/editor-core";
import {
  getVisualAnchorOrDefault,
  positionDeltaForAnchorChange,
} from "@game-editor/scene";
import type {
  getSprite,
  getTransform2D,
  getTransform3D,
  getVisualComponent,
} from "@game-editor/scene";
import { formatInspectorNumber, resolveInspectorNumber } from "./fields/format-inspector-number";
import type { getInspectorEffectiveTransform2D } from "./inspector-node-state";

export interface TransformDraft {
  x: string;
  y: string;
  rotation: string;
  scaleX: string;
  scaleY: string;
  skewX: string;
  skewY: string;
  anchorX: string;
  anchorY: string;
}

export interface Transform3DDraft {
  x: string;
  y: string;
  z: string;
  rotX: string;
  rotY: string;
  rotZ: string;
  scaleX: string;
  scaleY: string;
  scaleZ: string;
}

export interface SpriteSizeDraft {
  width: string;
  height: string;
}

export type Transform2DCommitTarget = {
  nodeId: string;
  transform: NonNullable<ReturnType<typeof getTransform2D>>;
  effectiveTransform2D: NonNullable<
    ReturnType<typeof getInspectorEffectiveTransform2D>
  >;
  visual: ReturnType<typeof getVisualComponent>;
  sprite: ReturnType<typeof getSprite>;
  supportsAnchor: boolean;
};

export type Transform3DCommitTarget = {
  nodeId: string;
  transform3D: NonNullable<ReturnType<typeof getTransform3D>>;
};

export type SizeCommitTarget = {
  nodeId: string;
  sprite: NonNullable<ReturnType<typeof getSprite>>;
};

export function createTransform2DDraft(
  transform: { skew?: { x: number; y: number } },
  effectiveTransform2D: {
    position: { x: number; y: number };
    rotation: number;
    scale: { x: number; y: number };
  },
  visualAnchor: { x: number; y: number } | undefined,
): TransformDraft {
  const skew = transform.skew ?? { x: 0, y: 0 };
  const anchor = visualAnchor ?? { x: 0.5, y: 0.5 };
  return {
    x: formatInspectorNumber(effectiveTransform2D.position.x),
    y: formatInspectorNumber(effectiveTransform2D.position.y),
    rotation: formatInspectorNumber(effectiveTransform2D.rotation),
    scaleX: formatInspectorNumber(effectiveTransform2D.scale.x),
    scaleY: formatInspectorNumber(effectiveTransform2D.scale.y),
    skewX: formatInspectorNumber(skew.x),
    skewY: formatInspectorNumber(skew.y),
    anchorX: formatInspectorNumber(anchor.x),
    anchorY: formatInspectorNumber(anchor.y),
  };
}

export function createTransform3DDraft(transform3D: {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}): Transform3DDraft {
  return {
    x: formatInspectorNumber(transform3D.position.x),
    y: formatInspectorNumber(transform3D.position.y),
    z: formatInspectorNumber(transform3D.position.z),
    rotX: formatInspectorNumber(transform3D.rotation.x),
    rotY: formatInspectorNumber(transform3D.rotation.y),
    rotZ: formatInspectorNumber(transform3D.rotation.z),
    scaleX: formatInspectorNumber(transform3D.scale.x),
    scaleY: formatInspectorNumber(transform3D.scale.y),
    scaleZ: formatInspectorNumber(transform3D.scale.z),
  };
}

export function createSpriteSizeDraft(sprite: {
  width: number;
  height: number;
}): SpriteSizeDraft {
  return {
    width: formatInspectorNumber(sprite.width),
    height: formatInspectorNumber(sprite.height),
  };
}

export function transform2DOverridePath(
  key: "x" | "y" | "rotation" | "scaleX" | "scaleY" | "skewX" | "skewY",
): string {
  if (key === "x" || key === "y") {
    return `position.${key}`;
  }
  if (key === "scaleX") {
    return "scale.x";
  }
  if (key === "scaleY") {
    return "scale.y";
  }
  if (key === "skewX") {
    return "skew.x";
  }
  if (key === "skewY") {
    return "skew.y";
  }
  return "rotation";
}

export function commitBoundTransform2D(
  editor: Editor,
  target: Transform2DCommitTarget,
  draft: TransformDraft,
): void {
  const { nodeId, transform: boundTransform, effectiveTransform2D: boundPose } =
    target;
  const x = resolveInspectorNumber(draft.x, boundPose.position.x);
  const y = resolveInspectorNumber(draft.y, boundPose.position.y);
  const rotation = resolveInspectorNumber(draft.rotation, boundPose.rotation);
  const scaleX = resolveInspectorNumber(draft.scaleX, boundPose.scale.x);
  const scaleY = resolveInspectorNumber(draft.scaleY, boundPose.scale.y);
  const currentSkew = boundTransform.skew ?? { x: 0, y: 0 };
  const skewX = resolveInspectorNumber(draft.skewX, currentSkew.x);
  const skewY = resolveInspectorNumber(draft.skewY, currentSkew.y);
  if (
    x === undefined ||
    y === undefined ||
    rotation === undefined ||
    scaleX === undefined ||
    scaleY === undefined ||
    skewX === undefined ||
    skewY === undefined
  ) {
    return;
  }
  const unchanged =
    x === boundPose.position.x &&
    y === boundPose.position.y &&
    rotation === boundPose.rotation &&
    scaleX === boundPose.scale.x &&
    scaleY === boundPose.scale.y &&
    skewX === currentSkew.x &&
    skewY === currentSkew.y;
  if (unchanged) {
    return;
  }
  const patch: Transform2DPatch = {
    position: { x, y },
    rotation,
    scale: { x: scaleX, y: scaleY },
    skew: { x: skewX, y: skewY },
  };
  editor.setTransform2D(nodeId, patch);
}

export function commitBoundAnchor(
  editor: Editor,
  target: Transform2DCommitTarget,
  draft: TransformDraft,
): void {
  if (!target.visual || !target.supportsAnchor) {
    return;
  }
  const { nodeId, visual: boundVisual, sprite: boundSprite, transform: boundTransform } =
    target;
  const current = getVisualAnchorOrDefault(boundVisual);
  const x = resolveInspectorNumber(draft.anchorX, current.x);
  const y = resolveInspectorNumber(draft.anchorY, current.y);
  if (x === undefined || y === undefined) {
    return;
  }
  if (x === current.x && y === current.y) {
    return;
  }
  const nextAnchor = { x, y };
  if (boundSprite && boundTransform) {
    const delta = positionDeltaForAnchorChange(
      current,
      nextAnchor,
      boundSprite.width,
      boundSprite.height,
      boundTransform.rotation,
      boundTransform.scale,
    );
    editor.execute(
      new CompositeCommand("SetVisualAnchor", [
        new SetVisualComponentCommand(editor.document, nodeId, {
          anchor: nextAnchor,
        }),
        new SetTransform2DCommand(editor.document, nodeId, {
          position: {
            x: boundTransform.position.x + delta.x,
            y: boundTransform.position.y + delta.y,
          },
        }),
      ]),
    );
    return;
  }
  editor.setVisualComponent(nodeId, { anchor: nextAnchor });
}

export function commitBoundTransform3D(
  editor: Editor,
  target: Transform3DCommitTarget,
  draft: Transform3DDraft,
): void {
  const { nodeId, transform3D: boundTransform3D } = target;
  const x = resolveInspectorNumber(draft.x, boundTransform3D.position.x);
  const y = resolveInspectorNumber(draft.y, boundTransform3D.position.y);
  const z = resolveInspectorNumber(draft.z, boundTransform3D.position.z);
  const rotX = resolveInspectorNumber(draft.rotX, boundTransform3D.rotation.x);
  const rotY = resolveInspectorNumber(draft.rotY, boundTransform3D.rotation.y);
  const rotZ = resolveInspectorNumber(draft.rotZ, boundTransform3D.rotation.z);
  const scaleX = resolveInspectorNumber(draft.scaleX, boundTransform3D.scale.x);
  const scaleY = resolveInspectorNumber(draft.scaleY, boundTransform3D.scale.y);
  const scaleZ = resolveInspectorNumber(draft.scaleZ, boundTransform3D.scale.z);
  if (
    x === undefined ||
    y === undefined ||
    z === undefined ||
    rotX === undefined ||
    rotY === undefined ||
    rotZ === undefined ||
    scaleX === undefined ||
    scaleY === undefined ||
    scaleZ === undefined
  ) {
    return;
  }
  const unchanged =
    x === boundTransform3D.position.x &&
    y === boundTransform3D.position.y &&
    z === boundTransform3D.position.z &&
    rotX === boundTransform3D.rotation.x &&
    rotY === boundTransform3D.rotation.y &&
    rotZ === boundTransform3D.rotation.z &&
    scaleX === boundTransform3D.scale.x &&
    scaleY === boundTransform3D.scale.y &&
    scaleZ === boundTransform3D.scale.z;
  if (unchanged) {
    return;
  }
  const patch: Transform3DPatch = {
    position: { x, y, z },
    rotation: { x: rotX, y: rotY, z: rotZ },
    scale: { x: scaleX, y: scaleY, z: scaleZ },
  };
  editor.setTransform3D(nodeId, patch);
}

export function commitBoundSpriteSize(
  editor: Editor,
  target: SizeCommitTarget,
  draft: SpriteSizeDraft,
): void {
  const { nodeId, sprite: boundSprite } = target;
  const width = resolveInspectorNumber(draft.width, boundSprite.width);
  const height = resolveInspectorNumber(draft.height, boundSprite.height);
  if (
    width === undefined ||
    height === undefined ||
    width <= 0 ||
    height <= 0
  ) {
    return;
  }
  if (width === boundSprite.width && height === boundSprite.height) {
    return;
  }
  editor.setSpriteSize(nodeId, { width, height });
}
