import path from "node:path";
import {
  createBitmapFontAssetRecord,
  getFileBasename,
  getFileStem,
  isBitmapFontDescriptorExtension,
  isSupportedTextureExtension,
  parseBitmapFontDescriptor,
} from "@game-editor/assets";
import { ValidationError } from "@game-editor/core";
import type {
  AssetBundleImporter,
  AssetBundlePartition,
  ImportFile,
  ImportPrepareContext,
  PreparedAssetImport,
} from "./asset-importer.js";
import { importBundleFolderHint } from "./import-path-allocator.js";

function fileKey(file: ImportFile): string {
  return getFileBasename(file.fileName).toLowerCase();
}

function descriptorMeta(file: ImportFile) {
  if (!isBitmapFontDescriptorExtension(file.fileName)) {
    return undefined;
  }
  return parseBitmapFontDescriptor(file.bytes.toString("utf8"));
}

/**
 * Groups a drop batch into complete BMFont sets (XML/FNT + page textures).
 * Incomplete sets are reported as errors and not imported as textures.
 */
export class BitmapFontAssetImporter implements AssetBundleImporter {
  readonly id = "font";

  partition(files: readonly ImportFile[]): AssetBundlePartition {
    const byName = new Map<string, ImportFile>();
    for (const file of files) {
      byName.set(fileKey(file), file);
    }
    const claimed = new Set<ImportFile>();
    const bundles: ImportFile[][] = [];
    const errors: Array<{ fileName: string; message: string }> = [];

    for (const file of files) {
      if (claimed.has(file)) {
        continue;
      }
      const meta = descriptorMeta(file);
      if (!meta) {
        continue;
      }

      const pages: ImportFile[] = [];
      const missing: string[] = [];
      for (const pageName of meta.pageNames) {
        const page = byName.get(pageName.toLowerCase());
        if (!page || !isSupportedTextureExtension(page.fileName)) {
          missing.push(pageName);
        } else {
          pages.push(page);
        }
      }

      claimed.add(file);
      for (const page of pages) {
        claimed.add(page);
      }

      if (missing.length > 0) {
        errors.push({
          fileName: file.fileName,
          message: `Incomplete bitmap font ${meta.fontFamily}: missing ${missing.join(", ")}`,
        });
        continue;
      }

      bundles.push([file, ...pages]);
    }

    return {
      bundles,
      remaining: files.filter((entry) => !claimed.has(entry)),
      errors,
    };
  }

  async prepareBundle(
    files: readonly ImportFile[],
    context: ImportPrepareContext,
  ): Promise<PreparedAssetImport> {
    const descriptor = files.find((file) =>
      isBitmapFontDescriptorExtension(file.fileName),
    );
    if (!descriptor) {
      throw new ValidationError("Bitmap font bundle is missing XML/FNT descriptor");
    }
    const meta = descriptorMeta(descriptor);
    if (!meta) {
      throw new ValidationError(
        `Not a bitmap font descriptor: ${descriptor.fileName}`,
      );
    }

    const stem = getFileStem(descriptor.fileName);
    const folder = context.allocateUniqueFolder(
      importBundleFolderHint(descriptor.fileName, stem),
    );
    const descriptorName = getFileBasename(descriptor.fileName);
    const relativeDescriptor = path.posix.join(folder, descriptorName);

    const preparedFiles = files.map((file) => ({
      relativePath: path.posix.join(folder, getFileBasename(file.fileName)),
      bytes: file.bytes,
    }));

    const pagePaths = preparedFiles
      .filter((entry) => entry.relativePath !== relativeDescriptor)
      .map((entry) => entry.relativePath);

    if (pagePaths.length === 0) {
      throw new ValidationError(
        `Bitmap font ${meta.fontFamily} has no page textures`,
      );
    }

    const record = createBitmapFontAssetRecord({
      name: stem,
      path: relativeDescriptor,
      fontFamily: meta.fontFamily,
      pagePaths,
    });

    return { record, files: preparedFiles };
  }
}
