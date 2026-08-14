import path from "node:path";
import {
  createWebFontAssetRecord,
  fontFamilyFromWebFontFileName,
  isSupportedWebFontExtension,
  mimeTypeForWebFontFileName,
  webFontFormatFromFileName,
} from "@game-editor/assets";
import { ValidationError } from "@game-editor/core";
import type {
  AssetImporter,
  ImportFile,
  ImportPrepareContext,
  PreparedAssetImport,
} from "./asset-importer.js";

/**
 * TTF/OTF/WOFF importer. Prepare-only; commit is owned by AssetImportService.
 */
export class WebFontAssetImporter implements AssetImporter {
  readonly id = "webfont";

  supports(file: ImportFile): boolean {
    return isSupportedWebFontExtension(file.fileName);
  }

  async prepare(
    file: ImportFile,
    context: ImportPrepareContext,
  ): Promise<PreparedAssetImport> {
    if (!this.supports(file)) {
      throw new ValidationError(`Unsupported file type: ${file.fileName}`);
    }

    if (file.bytes.byteLength === 0) {
      throw new ValidationError(`Empty webfont file: ${file.fileName}`);
    }

    const format = webFontFormatFromFileName(file.fileName);
    if (format === undefined) {
      throw new ValidationError(`Unsupported webfont file: ${file.fileName}`);
    }

    const relativePath = context.allocateRelativePath(file.fileName);
    const record = createWebFontAssetRecord({
      name: path.basename(relativePath, path.extname(relativePath)),
      path: relativePath,
      fontFamily: fontFamilyFromWebFontFileName(file.fileName),
      mimeType: mimeTypeForWebFontFileName(file.fileName),
      format,
    });

    return {
      record,
      files: [{ relativePath, bytes: file.bytes }],
    };
  }
}
