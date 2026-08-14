import { isSpineImportFile, isSupportedAsepriteFile, isSupportedAudioFile, isSupportedGltfFile, isSupportedTextureFile, isAsepriteAnimated } from "@game-editor/assets";
import type { Vec2 } from "@game-editor/scene";
import { isScenesFolderOrDescendant } from "./asset-browser-model.js";
import type { Editor } from "./editor.js";

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
      isSpineImportFile(file),
  );
  if (supported.length === 0) {
    return {
      importedCount: 0,
      errors: [],
      message:
        "No supported files (png/jpg/webp, mp3/ogg/wav, glb, .aseprite, or Spine json/skel/atlas)",
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
export function dropAssetOntoScene(
  editor: Editor,
  assetId: string,
  position: Vec2,
): string {
  const asset = editor.assets.get(assetId);
  if (asset?.type === "spine") {
    return editor.createSpineFromAsset(assetId, position);
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
  return editor.createSpriteFromAsset(assetId, position);
}

export const EDITOR_ASSET_MIME = "application/x-game-editor-asset";
export const EDITOR_FOLDER_MIME = "application/x-game-editor-folder";

export interface EditorAssetDragPayload {
  assetId: string;
}

export interface EditorFolderDragPayload {
  folderPath: string;
}

export function encodeAssetDragPayload(payload: EditorAssetDragPayload): string {
  return JSON.stringify(payload);
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
      return { assetId: (parsed as { assetId: string }).assetId };
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
