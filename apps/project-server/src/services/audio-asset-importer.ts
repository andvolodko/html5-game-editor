import path from "node:path";
import {
  createAudioAssetRecord,
  isSupportedAudioExtension,
  mimeTypeForAudioFileName,
} from "@game-editor/assets";
import { ValidationError } from "@game-editor/core";
import type {
  AssetImporter,
  ImportFile,
  ImportPrepareContext,
  PreparedAssetImport,
} from "./asset-importer.js";

/**
 * Audio (mp3/ogg/wav) importer. Prepare-only; commit is owned by AssetImportService.
 */
export class AudioAssetImporter implements AssetImporter {
  readonly id = "audio";

  supports(file: ImportFile): boolean {
    return isSupportedAudioExtension(file.fileName);
  }

  async prepare(
    file: ImportFile,
    context: ImportPrepareContext,
  ): Promise<PreparedAssetImport> {
    if (!this.supports(file)) {
      throw new ValidationError(`Unsupported file type: ${file.fileName}`);
    }

    if (file.bytes.byteLength === 0) {
      throw new ValidationError(`Empty audio file: ${file.fileName}`);
    }

    const relativePath = context.allocateRelativePath(path.basename(file.fileName));
    const record = createAudioAssetRecord({
      name: path.basename(relativePath, path.extname(relativePath)),
      path: relativePath,
      mimeType: mimeTypeForAudioFileName(relativePath),
    });

    return {
      record,
      files: [{ relativePath, bytes: file.bytes }],
    };
  }
}
