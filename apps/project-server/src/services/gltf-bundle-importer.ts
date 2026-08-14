import path from "node:path";
import {
  collectGltfExternalUris,
  createGltfAssetRecord,
  extractGltfAnimationNames,
  getFileBasename,
  getFileStem,
  isSupportedGltfJsonExtension,
  mimeTypeForGltfFileName,
  parseGltfJsonBytes,
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

/**
 * Multi-file `.gltf` + buffers/images importer (GLB stays on GltfAssetImporter).
 */
export class GltfBundleImporter implements AssetBundleImporter {
  readonly id = "gltf-bundle";

  partition(files: readonly ImportFile[]): AssetBundlePartition {
    const byName = new Map<string, ImportFile>();
    for (const file of files) {
      byName.set(fileKey(file), file);
    }
    const claimed = new Set<ImportFile>();
    const bundles: ImportFile[][] = [];
    const errors: Array<{ fileName: string; message: string }> = [];

    for (const file of files) {
      if (claimed.has(file) || !isSupportedGltfJsonExtension(file.fileName)) {
        continue;
      }
      let uris: string[];
      try {
        uris = collectGltfExternalUris(parseGltfJsonBytes(file.bytes));
      } catch {
        errors.push({
          fileName: file.fileName,
          message: `Invalid glTF JSON: ${file.fileName}`,
        });
        claimed.add(file);
        continue;
      }

      const parts: ImportFile[] = [file];
      const missing: string[] = [];
      for (const uri of uris) {
        const base = getFileBasename(uri);
        const part = byName.get(base.toLowerCase());
        if (!part) {
          missing.push(base);
          continue;
        }
        parts.push(part);
      }

      claimed.add(file);
      for (const part of parts) {
        claimed.add(part);
      }

      if (missing.length > 0) {
        errors.push({
          fileName: file.fileName,
          message: `Incomplete glTF set for ${getFileStem(file.fileName)}: missing ${missing.join(", ")}`,
        });
        continue;
      }

      bundles.push(parts);
    }

    const remaining = files.filter((file) => !claimed.has(file));
    return { bundles, remaining, errors };
  }

  async prepareBundle(
    files: readonly ImportFile[],
    context: ImportPrepareContext,
  ): Promise<PreparedAssetImport> {
    const root = files.find((file) => isSupportedGltfJsonExtension(file.fileName));
    if (!root) {
      throw new ValidationError("glTF bundle missing .gltf root");
    }
    if (root.bytes.byteLength === 0) {
      throw new ValidationError(`Empty glTF file: ${root.fileName}`);
    }

    const gltfJson = parseGltfJsonBytes(root.bytes);
    const uris = collectGltfExternalUris(gltfJson);
    const animations = extractGltfAnimationNames(gltfJson);
    const folder = context.allocateUniqueFolder(
      importBundleFolderHint(root.fileName, getFileStem(root.fileName)),
    );
    const rootRelative = `${folder}/${getFileBasename(root.fileName)}`;
    const written: Array<{ relativePath: string; bytes: Buffer }> = [
      { relativePath: rootRelative, bytes: Buffer.from(root.bytes) },
    ];

    const bufferPaths: string[] = [];
    const imagePaths: string[] = [];
    const byName = new Map(
      files.map((file) => [fileKey(file), file] as const),
    );

    for (const uri of uris) {
      const base = getFileBasename(uri);
      const part = byName.get(base.toLowerCase());
      if (!part) {
        throw new ValidationError(`Missing glTF part: ${base}`);
      }
      const relativePath = `${folder}/${base}`;
      written.push({ relativePath, bytes: Buffer.from(part.bytes) });
      const ext = path.extname(base).toLowerCase();
      if (ext === ".bin") {
        bufferPaths.push(relativePath);
      } else {
        imagePaths.push(relativePath);
      }
    }

    const record = createGltfAssetRecord({
      name: getFileStem(root.fileName),
      path: rootRelative,
      mimeType: mimeTypeForGltfFileName(rootRelative),
      format: "gltf",
      animations,
      ...(bufferPaths.length > 0 ? { bufferPaths } : {}),
      ...(imagePaths.length > 0 ? { imagePaths } : {}),
    });

    return { record, files: written };
  }
}
