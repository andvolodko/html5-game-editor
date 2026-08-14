import path from "node:path";
import {
  createAsepriteAssetRecord,
  getFileStem,
  isSupportedAsepriteExtension,
} from "@game-editor/assets";
import { ValidationError } from "@game-editor/core";
import type {
  AssetImporter,
  ImportFile,
  ImportPrepareContext,
  PreparedAssetImport,
} from "./asset-importer.js";

/**
 * Copies the `.aseprite` source into the project. Derived PNG/JSON are produced
 * later by AsepriteCompileService (CLI is an editor/build-time dependency).
 */
export class AsepriteAssetImporter implements AssetImporter {
  readonly id = "aseprite";

  supports(file: ImportFile): boolean {
    return isSupportedAsepriteExtension(file.fileName);
  }

  async prepare(
    file: ImportFile,
    context: ImportPrepareContext,
  ): Promise<PreparedAssetImport> {
    if (!this.supports(file)) {
      throw new ValidationError(`Unsupported file type: ${file.fileName}`);
    }
    if (file.bytes.byteLength === 0) {
      throw new ValidationError(`Empty Aseprite file: ${file.fileName}`);
    }

    const relativePath = context.allocateRelativePath(path.basename(file.fileName));
    const record = createAsepriteAssetRecord({
      name: getFileStem(relativePath),
      path: relativePath,
    });

    return {
      record,
      files: [{ relativePath, bytes: file.bytes }],
    };
  }
}
