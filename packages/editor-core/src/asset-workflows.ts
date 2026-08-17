import { isSpineImportFile, isBitmapFontImportFile, isSupportedAsepriteFile, isSupportedAudioFile, isSupportedGltfFile, isSupportedTextureFile, isSupportedWebFontFile, isAsepriteAnimated, humanizeAssetNodeName } from "@game-editor/assets";
import type { Vec2 } from "@game-editor/scene";
import { isScenesFolderOrDescendant } from "./asset-browser-model.js";
import type { Editor } from "./editor.js";
import { InstantiatePrefabCommand } from "./commands/instantiate-prefab-command.js";

export interface ImportDroppedFilesResult {
  importedCount: number;
  errors: Array<{ fileName: string; message: string }>;
  /** Human-readable summary for UI status lines. */
  message: string;
}

/**
 * Application workflow: OS / panel file drop → filtered import via AssetManager.
 * React should call this instead of orchestrating filters + messaging itself.
 */
export async function importDroppedFiles(
  editor: Editor,
  files: readonly File[],
  destination = "assets",
): Promise<ImportDroppedFilesResult> {
  if (isScenesFolderOrDescendant(destination)) {
    return {
      importedCount: 0,
      errors: [],
      message: "Cannot import assets into assets/scenes",
    };
  }

  const supported = files.filter(
    (file) =>
      isSupportedTextureFile(file) ||
      isSupportedAudioFile(file) ||
      isSupportedGltfFile(file) ||
      isSupportedAsepriteFile(file) ||
      isSpineImportFile(file) ||
      isBitmapFontImportFile(file) ||
      isSupportedWebFontFile(file),
  );
  if (supported.length === 0) {
    return {
      importedCount: 0,
      errors: [],
      message:
        "No supported files (png/jpg/webp, mp3/ogg/wav, glb, .aseprite, Spine json/skel/atlas, bitmap font xml/fnt, or webfont ttf/otf/woff)",
    };
  }

  const result = await editor.assets.importFiles(supported, destination);
  const errorText =
    result.errors.length > 0
      ? result.errors.map((e) => `${e.fileName}: ${e.message}`).join("; ")
      : null;

  return {
    importedCount: result.imported.length,
    errors: result.errors,
    message:
      errorText ??
      `Imported ${String(result.imported.length)} asset${result.imported.length === 1 ? "" : "s"}`,
  };
}

/**
 * Application workflow: Asset Browser drag → Scene drop → create command.
 */
export function dropAssetsOntoScene(
  editor: Editor,
  assetIds: readonly string[],
  position: Vec2,
): string[] {
  const created: string[] = [];
  for (const [index, assetId] of assetIds.entries()) {
    const offset = index * MULTI_ASSET_SCENE_DROP_OFFSET;
    created.push(
      dropAssetOntoScene(editor, assetId, {
        x: position.x + offset,
        y: position.y + offset,
      }),
    );
  }
  return created;
}

export function dropAssetOntoScene(
  editor: Editor,
  assetId: string,
  position: Vec2,
): string {
  const asset = editor.assets.get(assetId);
  if (asset?.type === "spine") {
    return editor.createSpineFromAsset(assetId, position);
  }
  if (asset?.type === "font") {
    return editor.createBitmapTextFromAsset(assetId, position);
  }
  if (asset?.type === "webfont") {
    return editor.createTextFromAsset(assetId, position);
  }
  if (asset?.type === "aseprite") {
    if (asset.metadata.kind === "aseprite" && isAsepriteAnimated(asset.metadata)) {
      return editor.createAnimatedSpriteFromAsset(assetId, position);
    }
    return editor.createSpriteFromAsset(assetId, position);
  }
  if (asset?.type === "gltf") {
    return editor.createModel3DFromAsset(assetId, position);
  }
  if (asset?.type === "audio") {
    throw new Error("Audio assets cannot be dropped onto the scene yet");
  }
  if (asset?.type === "tileset") {
    const tileset = editor.assets.resolveTileSet(assetId);
    return editor.createNode({
      typeId: "pixi.tilemap",
      name: humanizeAssetNodeName(asset.name),
      position,
      assetId,
      ...(tileset !== undefined
        ? { tileWidth: tileset.tileWidth, tileHeight: tileset.tileHeight }
        : {}),
    });
  }
  if (asset?.type === "prefab") {
    const prefab = editor.prefabs.get(assetId);
    if (!prefab) {
      throw new Error(`Prefab asset ${assetId} is not loaded yet`);
    }
    const command = new InstantiatePrefabCommand(editor.document, editor.selection, {
      prefab,
      prefabAssetId: assetId,
      position2D: position,
      catalog: editor.prefabs.getCatalog(),
    });
    editor.execute(command);
    return command.createdNodeId;
  }
  return editor.createSpriteFromAsset(assetId, position);
}

export const EDITOR_ASSET_MIME = "application/x-game-editor-asset";
export const EDITOR_FOLDER_MIME = "application/x-game-editor-folder";

export interface EditorAssetDragPayload {
  /** Primary / first dragged asset (backward compatible). */
  assetId: string;
  /** All dragged assets when multi-select is active. */
  assetIds?: readonly string[];
}

/** Pixels to offset each extra asset when several are dropped on the scene. */
export const MULTI_ASSET_SCENE_DROP_OFFSET = 24;

export function assetIdsFromDragPayload(
  payload: EditorAssetDragPayload,
): string[] {
  if (payload.assetIds && payload.assetIds.length > 0) {
    return [...payload.assetIds];
  }
  return [payload.assetId];
}

export interface EditorFolderDragPayload {
  folderPath: string;
}

export function encodeAssetDragPayload(payload: EditorAssetDragPayload): string {
  const assetIds =
    payload.assetIds && payload.assetIds.length > 0
      ? [...payload.assetIds]
      : [payload.assetId];
  return JSON.stringify({
    assetId: payload.assetId,
    assetIds,
  });
}

function readAssetIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const ids = value.filter((entry): entry is string => typeof entry === "string");
  return ids.length > 0 ? ids : undefined;
}

export function decodeAssetDragPayload(
  raw: string,
): EditorAssetDragPayload | undefined {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "assetId" in parsed &&
      typeof (parsed as { assetId: unknown }).assetId === "string"
    ) {
      const assetId = (parsed as { assetId: string }).assetId;
      const assetIds = readAssetIds((parsed as { assetIds?: unknown }).assetIds);
      return assetIds ? { assetId, assetIds } : { assetId };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function encodeFolderDragPayload(payload: EditorFolderDragPayload): string {
  return JSON.stringify(payload);
}

export function decodeFolderDragPayload(
  raw: string,
): EditorFolderDragPayload | undefined {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "folderPath" in parsed &&
      typeof (parsed as { folderPath: unknown }).folderPath === "string"
    ) {
      return { folderPath: (parsed as { folderPath: string }).folderPath };
    }
  } catch {
    return undefined;
  }
  return undefined;
}
