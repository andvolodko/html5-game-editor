import { access, copyFile, lstat, mkdir, realpath, rename, rm } from "node:fs/promises";
import path from "node:path";
import { GENERATED_ASSETS_ROOT } from "@game-editor/assets";
import { DomainError, ValidationError } from "@game-editor/core";
import type { ProjectService } from "./project-service.js";

function normalizeRelative(relative: string): string {
  return relative.replace(/\\/g, "/").replace(/^\/+/, "");
}

function isGeneratedRelative(relative: string): boolean {
  const normalized = normalizeRelative(relative);
  return (
    normalized === GENERATED_ASSETS_ROOT ||
    normalized.startsWith(`${GENERATED_ASSETS_ROOT}/`)
  );
}

/**
 * Copy / rename / delete derived Aseprite files under `.generated/` only.
 */
export class GeneratedAssetFileService {
  constructor(private readonly projectService: ProjectService) {}

  async copyFile(fromRelative: string, toRelative: string): Promise<void> {
    const from = this.assertGeneratedFilePath(fromRelative);
    const to = this.assertGeneratedFilePath(toRelative);
    const fromAbsolute = this.projectService.resolveProjectPath(from);
    const toAbsolute = this.projectService.resolveProjectPath(to);
    try {
      await access(fromAbsolute);
    } catch {
      return;
    }
    try {
      await access(toAbsolute);
      throw new DomainError("ASSET_PATH_EXISTS", `Path already exists: ${to}`);
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }
    }
    await mkdir(path.dirname(toAbsolute), { recursive: true });
    await copyFile(fromAbsolute, toAbsolute);
  }

  async renameFile(fromRelative: string, toRelative: string): Promise<void> {
    const from = this.assertGeneratedFilePath(fromRelative);
    const to = this.assertGeneratedFilePath(toRelative);
    const fromAbsolute = this.projectService.resolveProjectPath(from);
    const toAbsolute = this.projectService.resolveProjectPath(to);
    try {
      await access(fromAbsolute);
    } catch {
      return;
    }
    try {
      await access(toAbsolute);
      throw new DomainError("ASSET_PATH_EXISTS", `Path already exists: ${to}`);
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }
    }
    await mkdir(path.dirname(toAbsolute), { recursive: true });
    await rename(fromAbsolute, toAbsolute);
  }

  async removeFile(relative: string): Promise<void> {
    const normalized = this.assertGeneratedFilePath(relative);
    const absolute = this.projectService.resolveProjectPath(normalized);
    let stats;
    try {
      stats = await lstat(absolute);
    } catch {
      return;
    }
    if (stats.isSymbolicLink()) {
      throw new ValidationError("Refusing to delete a symbolic link");
    }
    if (!stats.isFile()) {
      throw new ValidationError(`Not a file: ${normalized}`);
    }
    await this.assertInsideGeneratedRoot(absolute, normalized);
    await rm(absolute);
  }

  async removeDirectory(relative: string): Promise<void> {
    const normalized = this.assertGeneratedFilePath(relative);
    if (normalized === GENERATED_ASSETS_ROOT) {
      throw new ValidationError("Cannot delete the generated assets root");
    }
    const absolute = this.projectService.resolveProjectPath(normalized);
    let stats;
    try {
      stats = await lstat(absolute);
    } catch {
      return;
    }
    if (stats.isSymbolicLink()) {
      throw new ValidationError("Refusing to delete a symbolic link");
    }
    if (!stats.isDirectory()) {
      return;
    }
    await this.assertInsideGeneratedRoot(absolute, normalized);
    await rm(absolute, { recursive: true });
  }

  private assertGeneratedFilePath(relative: string): string {
    const normalized = normalizeRelative(relative);
    if (!isGeneratedRelative(normalized) || normalized.includes("..")) {
      throw new ValidationError(
        `Refusing generated-asset path outside ${GENERATED_ASSETS_ROOT}/: ${relative}`,
      );
    }
    return normalized;
  }

  private async assertInsideGeneratedRoot(
    absolute: string,
    label: string,
  ): Promise<void> {
    const generatedRoot = this.projectService.resolveProjectPath(
      GENERATED_ASSETS_ROOT,
    );
    const realAbsolute = await realpath(absolute);
    const realGenerated = await realpath(generatedRoot).catch(() => generatedRoot);
    const rootWithSep = realGenerated.endsWith(path.sep)
      ? realGenerated
      : `${realGenerated}${path.sep}`;
    if (realAbsolute !== realGenerated && !realAbsolute.startsWith(rootWithSep)) {
      throw new DomainError(
        "PATH_ESCAPE",
        `Refusing to delete path outside ${GENERATED_ASSETS_ROOT}/: ${label}`,
      );
    }
  }
}
