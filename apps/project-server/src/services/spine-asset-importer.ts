import path from "node:path";
import {
  createSpineAssetRecord,
  getFileBasename,
  getFileExtension,
  getFileStem,
  isSpineAtlasFile,
  isSpineSkeletonExtension,
  isSpineSkeletonJson,
  isSupportedTextureExtension,
  parseAtlasPageNames,
  parseSpineSkeletonJsonBytes,
  parseSpineSkeletonMeta,
  SPINE_JSON_EXTENSION,
  SPINE_SKEL_EXTENSION,
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

function isSpineSkeletonFile(file: ImportFile): boolean {
  const ext = getFileExtension(file.fileName);
  if (ext === SPINE_SKEL_EXTENSION) {
    return true;
  }
  if (ext !== SPINE_JSON_EXTENSION) {
    return false;
  }
  return isSpineSkeletonJson(parseSpineSkeletonJsonBytes(file.bytes));
}

/**
 * Groups a drop batch into complete Spine sets (skeleton + atlas + pages).
 * Incomplete sets are reported as errors and not imported as textures.
 */
export class SpineAssetImporter implements AssetBundleImporter {
  readonly id = "spine";

  partition(files: readonly ImportFile[]): AssetBundlePartition {
    const byName = new Map<string, ImportFile>();
    for (const file of files) {
      byName.set(fileKey(file), file);
    }
    const claimed = new Set<ImportFile>();
    const bundles: ImportFile[][] = [];
    const errors: Array<{ fileName: string; message: string }> = [];

    for (const file of files) {
      if (claimed.has(file) || !isSpineSkeletonFile(file)) {
        continue;
      }
      const stem = getFileStem(file.fileName);
      const atlas = byName.get(`${stem.toLowerCase()}.atlas`);
      if (!atlas || !isSpineAtlasFile(atlas.fileName)) {
        errors.push({
          fileName: file.fileName,
          message: `Incomplete Spine set for ${stem}: missing ${stem}.atlas`,
        });
        claimed.add(file);
        continue;
      }

      const atlasText = atlas.bytes.toString("utf8");
      const pageNames = parseAtlasPageNames(atlasText);
      const namesToFind =
        pageNames.length > 0 ? pageNames : [`${stem}.png`];
      const pages: ImportFile[] = [];
      const missing: string[] = [];
      for (const pageName of namesToFind) {
        const page = byName.get(pageName.toLowerCase());
        if (!page || !isSupportedTextureExtension(page.fileName)) {
          missing.push(pageName);
        } else {
          pages.push(page);
        }
      }

      claimed.add(file);
      claimed.add(atlas);
      for (const page of pages) {
        claimed.add(page);
      }

      if (missing.length > 0) {
        errors.push({
          fileName: file.fileName,
          message: `Incomplete Spine set for ${stem}: missing ${missing.join(", ")}`,
        });
        continue;
      }

      bundles.push([file, atlas, ...pages]);
    }

    return {
      bundles,
      remaining: files.filter((file) => !claimed.has(file)),
      errors,
    };
  }

  async prepareBundle(
    files: readonly ImportFile[],
    context: ImportPrepareContext,
  ): Promise<PreparedAssetImport> {
    const skeleton = files.find((file) => isSpineSkeletonExtension(file.fileName));
    const atlas = files.find((file) => isSpineAtlasFile(file.fileName));
    if (!skeleton || !atlas) {
      throw new ValidationError("Spine bundle is missing skeleton or atlas");
    }

    const ext = getFileExtension(skeleton.fileName);
    const skeletonFormat = ext === SPINE_SKEL_EXTENSION ? "skel" : "json";
    const stem = getFileStem(skeleton.fileName);
    let skins: string[] = [];
    let animations: string[] = [];
    if (skeletonFormat === "json") {
      const json = parseSpineSkeletonJsonBytes(skeleton.bytes);
      if (!isSpineSkeletonJson(json)) {
        throw new ValidationError(`Not a Spine skeleton JSON: ${skeleton.fileName}`);
      }
      const meta = parseSpineSkeletonMeta(json);
      skins = meta.skins;
      animations = meta.animations;
    }

    const folder = context.allocateUniqueFolder(
      importBundleFolderHint(skeleton.fileName, stem),
    );
    const skeletonName = getFileBasename(skeleton.fileName);
    const atlasName = getFileBasename(atlas.fileName);
    const relativeSkeleton = path.posix.join(folder, skeletonName);
    const relativeAtlas = path.posix.join(folder, atlasName);

    const preparedFiles = files.map((file) => ({
      relativePath: path.posix.join(folder, getFileBasename(file.fileName)),
      bytes: file.bytes,
    }));

    const pagePaths = preparedFiles
      .filter(
        (entry) =>
          entry.relativePath !== relativeSkeleton &&
          entry.relativePath !== relativeAtlas,
      )
      .map((entry) => entry.relativePath);

    if (pagePaths.length === 0) {
      throw new ValidationError(`Spine set for ${stem} has no atlas page textures`);
    }

    const record = createSpineAssetRecord({
      name: stem,
      path: relativeSkeleton,
      skeletonFormat,
      atlasPath: relativeAtlas,
      pagePaths,
      skins,
      animations,
    });

    return { record, files: preparedFiles };
  }
}
