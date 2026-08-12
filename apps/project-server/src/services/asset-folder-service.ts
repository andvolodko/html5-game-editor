import { access, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { DomainError, ValidationError } from "@game-editor/core";
import type { ProjectService } from "./project-service.js";
import { normalizeAssetDestination } from "./asset-path-utils.js";

export const ASSETS_ROOT_FOLDER = "assets";
const SCENES_FOLDER = "assets/scenes";

const FOLDER_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._ -]*$/;

/**
 * Filesystem folders under assets/. Empty folders are first-class so the
 * Asset Browser can navigate before any files are imported.
 */
export class AssetFolderService {
  constructor(private readonly projectService: ProjectService) {}

  async listFolders(): Promise<string[]> {
    const folders = new Set<string>([ASSETS_ROOT_FOLDER]);
    const rootAbsolute = this.projectService.resolveProjectPath(ASSETS_ROOT_FOLDER);

    try {
      await access(rootAbsolute);
    } catch {
      return [ASSETS_ROOT_FOLDER];
    }

    await walkDirectories(rootAbsolute, ASSETS_ROOT_FOLDER, folders);
    return [...folders].sort();
  }

  /**
   * Creates a folder under assets/ (recursive). Path is sanitized like import destinations.
   */
  async createFolder(destinationFolder: string): Promise<string> {
    const folder = normalizeAssetDestination(destinationFolder);
    if (folder === ASSETS_ROOT_FOLDER) {
      throw new ValidationError("Cannot recreate the assets root folder");
    }
    if (folder === SCENES_FOLDER || folder.startsWith(`${SCENES_FOLDER}/`)) {
      throw new ValidationError(
        "Cannot create folders under the reserved scenes folder",
      );
    }

    for (const segment of folder.split("/").slice(1)) {
      assertValidFolderSegment(segment);
    }

    const absolute = this.projectService.resolveProjectPath(folder);
    try {
      await access(absolute);
      throw new DomainError("FOLDER_EXISTS", `Folder already exists: ${folder}`);
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }
      // missing → create
    }

    await mkdir(absolute, { recursive: true });
    return folder;
  }
}

export function assertValidFolderSegment(segment: string): void {
  if (!FOLDER_NAME_PATTERN.test(segment)) {
    throw new ValidationError(`Invalid folder name: ${segment}`);
  }
}

async function walkDirectories(
  absolute: string,
  relative: string,
  out: Set<string>,
): Promise<void> {
  const entries = await readdir(absolute, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (entry.name === "." || entry.name === "..") {
      continue;
    }
    const childRelative = path.posix.join(relative, entry.name);
    out.add(childRelative);
    await walkDirectories(path.join(absolute, entry.name), childRelative, out);
  }
}
