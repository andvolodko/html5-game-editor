import path from "node:path";
import {
  createGltfAssetRecord,
  extractGltfAnimationNamesFromBytes,
  gltfFormatFromFileName,
  isSupportedGlbExtension,
  mimeTypeForGltfFileName,
} from "@game-editor/assets";
import { ValidationError } from "@game-editor/core";
import type {
  AssetImporter,
  ImportFile,
  ImportPrepareContext,
  PreparedAssetImport,
} from "./asset-importer.js";

/**
 * GLB (single-file glTF) importer. Multi-file `.gltf` bundles deferred.
 * Prepare-only; commit is owned by AssetImportService.
 */
export class GltfAssetImporter implements AssetImporter {
  readonly id = "gltf";

  supports(file: ImportFile): boolean {
    return isSupportedGlbExtension(file.fileName);
  }

  async prepare(
    file: ImportFile,
    context: ImportPrepareContext,
  ): Promise<PreparedAssetImport> {
    if (!this.supports(file)) {
      throw new ValidationError(`Unsupported file type: ${file.fileName}`);
    }

    if (file.bytes.byteLength === 0) {
      throw new ValidationError(`Empty glTF file: ${file.fileName}`);
    }

    let animations: string[] = [];
    try {
      animations = extractGltfAnimationNamesFromBytes(file.bytes, "glb");
    } catch {
      throw new ValidationError(`Invalid GLB file: ${file.fileName}`);
    }

    const relativePath = context.allocateRelativePath(path.basename(file.fileName));
    const record = createGltfAssetRecord({
      name: path.basename(relativePath, path.extname(relativePath)),
      path: relativePath,
      mimeType: mimeTypeForGltfFileName(relativePath),
      format: gltfFormatFromFileName(relativePath),
      animations,
    });

    return {
      record,
      files: [{ relativePath, bytes: file.bytes }],
    };
  }
}
