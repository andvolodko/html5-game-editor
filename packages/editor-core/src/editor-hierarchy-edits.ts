import { CompositeCommand } from "@game-editor/commands";
import { humanizeAssetNodeName, rasterAssetDisplaySize } from "@game-editor/assets";
import type { Vec2 } from "@game-editor/scene";
import type { Editor } from "./editor.js";
import type { HierarchyMultiMove } from "./hierarchy-dnd.js";
import {
  CreateSpriteCommand,
  CreateSpineCommand,
  CreateAnimatedSpriteCommand,
  CreateModel3DCommand,
  CreateNodeCommand,
  DeleteNodeCommand,
  DuplicateNodeCommand,
  MoveNodeCommand,
  RenameNodeCommand,
  SetSceneNameCommand,
  createDeleteSelectionCommand,
  type CreateSpriteOptions,
  type CreateAnimatedSpriteOptions,
  type CreateNodeOptions,
} from "./commands/index.js";
import {
  ensureDefaultNodeTypesRegistered,
  resolveCreateParentId,
  type NodeTypeId,
} from "./node-types/index.js";
import { isNodeEffectivelyLocked } from "./editor-node-metadata.js";

export function editorCreateSprite(
  editor: Editor,
  name?: string,
  position?: Vec2,
): string {
  return editorCreateNode(editor, {
    typeId: "pixi.sprite",
    ...(name !== undefined ? { name } : {}),
    ...(position !== undefined ? { position } : {}),
  });
}

export function editorCreateSpriteFromAsset(
  editor: Editor,
  assetId: string,
  position: Vec2,
): string {
  const asset = editor.assets.get(assetId);
  const options: CreateSpriteOptions = {
    name: asset ? humanizeAssetNodeName(asset.name) : "Missing Sprite",
    position,
    assetId,
  };
  const size = asset ? rasterAssetDisplaySize(asset) : undefined;
  if (size) {
    options.width = size.width;
    options.height = size.height;
  }
  const command = new CreateSpriteCommand(
    editor.document,
    editor.selection,
    options,
  );
  editor.execute(command);
  return command.createdNodeId;
}

export function editorCreateAnimatedSpriteFromAsset(
  editor: Editor,
  assetId: string,
  position: Vec2,
): string {
  const asset = editor.assets.get(assetId);
  const options: CreateAnimatedSpriteOptions = {
    name: asset ? humanizeAssetNodeName(asset.name) : "Missing Animated Sprite",
    position,
    assetId,
    playing: true,
  };
  if (asset?.metadata.kind === "aseprite") {
    options.animation = asset.metadata.tags[0]?.name;
    const size = rasterAssetDisplaySize(asset);
    if (size) {
      options.width = size.width;
      options.height = size.height;
    }
  }
  const command = new CreateAnimatedSpriteCommand(
    editor.document,
    editor.selection,
    options,
  );
  editor.execute(command);
  return command.createdNodeId;
}

export function editorCreateSpineFromAsset(
  editor: Editor,
  assetId: string,
  position: Vec2,
): string {
  const asset = editor.assets.get(assetId);
  const command = new CreateSpineCommand(editor.document, editor.selection, {
    name: asset ? humanizeAssetNodeName(asset.name) : "Missing Spine",
    position,
    assetId,
  });
  editor.execute(command);
  return command.createdNodeId;
}

export function editorCreateBitmapTextFromAsset(
  editor: Editor,
  assetId: string,
  position: Vec2,
): string {
  const asset = editor.assets.get(assetId);
  return editorCreateNode(editor, {
    typeId: "pixi.bitmap-text",
    name: asset ? humanizeAssetNodeName(asset.name) : "Missing Bitmap Font",
    position,
    assetId,
    resolveParent: false,
  });
}

export function editorCreateTextFromAsset(
  editor: Editor,
  assetId: string,
  position: Vec2,
): string {
  const asset = editor.assets.get(assetId);
  const fontFamily =
    asset?.metadata.kind === "webfont"
      ? asset.metadata.fontFamily
      : undefined;
  return editorCreateNode(editor, {
    typeId: "pixi.text",
    name: asset ? humanizeAssetNodeName(asset.name) : "Missing Font",
    position,
    assetId,
    ...(fontFamily !== undefined ? { fontFamily } : {}),
    resolveParent: false,
  });
}

export function editorCreateModel3DFromAsset(
  editor: Editor,
  assetId: string,
  position: Vec2,
): string {
  const asset = editor.assets.get(assetId);
  const command = new CreateModel3DCommand(editor.document, editor.selection, {
    name: asset ? humanizeAssetNodeName(asset.name) : "Missing Model",
    position,
    assetId,
  });
  editor.execute(command);
  return command.createdNodeId;
}

export function editorCreateContainer(
  editor: Editor,
  parentId?: string,
): string {
  return editorCreateNode(editor, {
    typeId: "pixi.container",
    ...(parentId !== undefined ? { parentId, resolveParent: false } : {}),
  });
}

export function editorCreateNode(
  editor: Editor,
  options: CreateNodeOptions | NodeTypeId,
): string {
  ensureDefaultNodeTypesRegistered();
  const normalized: CreateNodeOptions =
    typeof options === "string" ? { typeId: options } : options;
  const scene = editor.getScene();
  const resolveParent = normalized.resolveParent !== false;
  const parentId = resolveParent
    ? resolveCreateParentId(scene, editor.selection.getPrimaryNodeId())
    : normalized.parentId;
  if (parentId !== undefined && editor.isNodeEffectivelyLocked(parentId)) {
    return "";
  }
  const command = new CreateNodeCommand(
    editor.document,
    editor.selection,
    normalized,
  );
  editor.execute(command);
  return command.createdNodeId;
}

export function editorRenameNode(
  editor: Editor,
  nodeId: string,
  name: string,
): void {
  if (editor.isNodeEffectivelyLocked(nodeId)) {
    return;
  }
  editor.execute(new RenameNodeCommand(editor.document, nodeId, name));
}

export function editorRenameScene(editor: Editor, name: string): void {
  editor.execute(new SetSceneNameCommand(editor.document, name));
}

export function editorDuplicateNode(
  editor: Editor,
  nodeId?: string,
): string | undefined {
  const id = nodeId ?? editor.selection.getPrimaryNodeId();
  if (!id || editor.isNodeEffectivelyLocked(id)) {
    return undefined;
  }
  try {
    const command = new DuplicateNodeCommand(
      editor.document,
      editor.selection,
      id,
    );
    editor.execute(command);
    return command.createdNodeId;
  } catch (error) {
    editor.console.log({
      level: "warn",
      category: "prefab",
      message: error instanceof Error ? error.message : "Duplicate failed",
    });
    return undefined;
  }
}

export function editorDeleteSelectedNodes(editor: Editor): void {
  const scene = editor.document.getScene();
  const unlocked = editor.selection
    .getSelectedNodeIds()
    .filter(
      (id) =>
        !isNodeEffectivelyLocked(scene, editor.nodeMetadata.getSnapshot(), id),
    );
  if (unlocked.length === 0) {
    return;
  }
  const previous = editor.selection.getSelectedNodeIds();
  editor.selection.setSelection(unlocked);
  const command = createDeleteSelectionCommand(
    editor.document,
    editor.selection,
  );
  if (!command) {
    editor.selection.setSelection(previous);
    return;
  }
  editor.execute(command);
}

export function editorDeleteNode(editor: Editor, nodeId: string): void {
  if (editor.isNodeEffectivelyLocked(nodeId)) {
    return;
  }
  try {
    editor.execute(
      new DeleteNodeCommand(editor.document, editor.selection, nodeId),
    );
  } catch (error) {
    editor.console.log({
      level: "warn",
      category: "prefab",
      message: error instanceof Error ? error.message : "Delete failed",
    });
  }
}

export function editorMoveNode(
  editor: Editor,
  nodeId: string,
  toParentId: string | undefined,
  toIndex: number,
  options?: { preserveWorldTransform?: boolean },
): void {
  if (editor.isNodeEffectivelyLocked(nodeId)) {
    return;
  }
  if (toParentId !== undefined && editor.isNodeEffectivelyLocked(toParentId)) {
    return;
  }
  try {
    editor.execute(
      new MoveNodeCommand(editor.document, {
        nodeId,
        toParentId,
        toIndex,
        ...(options?.preserveWorldTransform !== undefined
          ? { preserveWorldTransform: options.preserveWorldTransform }
          : {}),
      }),
    );
  } catch (error) {
    editor.console.log({
      level: "warn",
      category: "prefab",
      message: error instanceof Error ? error.message : "Move failed",
    });
  }
}

export function editorMoveNodes(
  editor: Editor,
  moves: readonly HierarchyMultiMove[],
): void {
  if (moves.length === 0) {
    return;
  }
  const allowed = moves.filter((move) => {
    if (editor.isNodeEffectivelyLocked(move.nodeId)) {
      return false;
    }
    return (
      move.toParentId === undefined ||
      !editor.isNodeEffectivelyLocked(move.toParentId)
    );
  });
  if (allowed.length === 0) {
    return;
  }
  if (allowed.length === 1) {
    const only = allowed[0];
    if (!only) {
      return;
    }
    editorMoveNode(editor, only.nodeId, only.toParentId, only.toIndex);
    return;
  }
  try {
    const commands = allowed.map(
      (move) =>
        new MoveNodeCommand(editor.document, {
          nodeId: move.nodeId,
          toParentId: move.toParentId,
          toIndex: move.toIndex,
        }),
    );
    editor.execute(new CompositeCommand("MoveNodes", commands));
  } catch (error) {
    editor.console.log({
      level: "warn",
      category: "prefab",
      message: error instanceof Error ? error.message : "Move failed",
    });
  }
}
