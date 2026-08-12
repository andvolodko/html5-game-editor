import path from "node:path";
import { imageSize } from "image-size";
import {
  createTextureAssetRecord,
  isSupportedTextureExtension,
  mimeTypeForTextureFileName,
} from "@game-editor/assets";
import { ValidationError } from "@game-editor/core";
import type {
  AssetImporter,
  ImportFile,
  ImportPrepareContext,
  PreparedAssetImport,
} from "./asset-importer.js";

/**
 * Texture (png/jpg/webp) importer. Prepare-only; commit is owned by AssetImportService.
 */
export class TextureAssetImporter implements AssetImporter {
  readonly id = "texture";

  supports(file: ImportFile): boolean {
    return isSupportedTextureExtension(file.fileName);
  }

  async prepare(
    file: ImportFile,
    context: ImportPrepareContext,
  ): Promise<PreparedAssetImport> {
    if (!this.supports(file)) {
      throw new ValidationError(`Unsupported file type: ${file.fileName}`);
    }

    let dimensions: { width?: number; height?: number };
    try {
      dimensions = imageSize(file.bytes);
    } catch (error) {
      throw new ValidationError(`Could not read image dimensions for ${file.fileName}`, {
        cause: error,
      });
    }

    if (!dimensions.width || !dimensions.height) {
      throw new ValidationError(`Missing image dimensions for ${file.fileName}`);
    }

    const relativePath = context.allocateRelativePath(path.basename(file.fileName));
    const record = createTextureAssetRecord({
      name: path.basename(relativePath, path.extname(relativePath)),
      path: relativePath,
      width: dimensions.width,
      height: dimensions.height,
      mimeType: mimeTypeForTextureFileName(relativePath),
    });

    return {
      record,
      files: [{ relativePath, bytes: file.bytes }],
    };
  }
}
