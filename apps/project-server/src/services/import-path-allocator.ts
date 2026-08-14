import path from "node:path";
import { ValidationError } from "@game-editor/core";
import {
  allocateUniqueFileName,
  normalizeAssetDestination,
  sanitizeImportFileRelativePath,
  sanitizeImportFolderPath,
} from "./asset-path-utils.js";

export const ASSET_SCENES_FOLDER = "assets/scenes";

export function importBundleFolderHint(fileName: string, stem: string): string {
  const relative = sanitizeImportFileRelativePath(fileName);
  const dir = path.posix.dirname(relative);
  return dir === "." ? stem : dir;
}

function isScenesFolderOrDescendant(folderPath: string): boolean {
  return (
    folderPath === ASSET_SCENES_FOLDER ||
    folderPath.startsWith(`${ASSET_SCENES_FOLDER}/`)
  );
}

/**
 * Allocates unique project-relative file/folder paths under an import destination,
 * preserving nested folders from dropped OS directories.
 */
export class ImportPathAllocator {
  private readonly namesByDir = new Map<string, Set<string>>();
  private readonly destination: string;

  constructor(destinationFolder?: string) {
    this.destination = normalizeAssetDestination(destinationFolder);
  }

  registerExistingAssetPath(assetPath: string): void {
    this.registerChain(assetPath.replace(/\\/g, "/"));
  }

  allocateRelativePath(desiredFileName: string): string {
    const relative = sanitizeImportFileRelativePath(desiredFileName);
    const dirPart = path.posix.dirname(relative);
    const baseName = path.posix.basename(relative);
    const destDir =
      dirPart === "." ? this.destination : path.posix.join(this.destination, dirPart);
    assertNotScenes(destDir);
    const uniqueName = allocateUniqueFileName(baseName, this.namesIn(destDir));
    const full = path.posix.join(destDir, uniqueName);
    this.registerChain(full);
    return full;
  }

  allocateUniqueFolder(desiredFolderName: string): string {
    const relative = sanitizeImportFolderPath(desiredFolderName);
    const dirPart = path.posix.dirname(relative);
    const leaf = path.posix.basename(relative);
    const destParent =
      dirPart === "." ? this.destination : path.posix.join(this.destination, dirPart);
    assertNotScenes(destParent);
    const occupied = this.namesIn(destParent);
    let candidate = leaf;
    let index = 1;
    while (occupied.has(candidate.toLowerCase())) {
      candidate = `${leaf}-${String(index)}`;
      index += 1;
    }
    const full = path.posix.join(destParent, candidate);
    assertNotScenes(full);
    this.registerChain(full);
    return full;
  }

  private namesIn(dir: string): Set<string> {
    return this.namesByDir.get(dir) ?? new Set();
  }

  private occupy(dir: string, name: string): void {
    let names = this.namesByDir.get(dir);
    if (!names) {
      names = new Set();
      this.namesByDir.set(dir, names);
    }
    names.add(name.toLowerCase());
  }

  private registerChain(fullPath: string): void {
    const parts = fullPath.split("/").filter((part) => part.length > 0);
    for (let index = 1; index < parts.length; index += 1) {
      const dir = parts.slice(0, index).join("/");
      const name = parts[index];
      if (!name) {
        continue;
      }
      this.occupy(dir, name);
    }
  }
}

function assertNotScenes(folderPath: string): void {
  if (isScenesFolderOrDescendant(folderPath)) {
    throw new ValidationError(
      "Cannot import assets into the scenes folder (assets/scenes)",
    );
  }
}
