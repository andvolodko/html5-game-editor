import { access, constants, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { DomainError } from "@game-editor/core";

const execFileAsync = promisify(execFile);

export const ASEPRITE_CLI_MISSING_MESSAGE =
  "Aseprite CLI was not found.\n\nRun `pnpm install-libresprite`, or install Aseprite / LibreSprite and make sure `aseprite` or `libresprite` is available in PATH (or set the ASEPRITE environment variable).";

export const PACKAGED_LIBRESPRITE_DIR = "vendor/libresprite";
export const PACKAGED_LIBRESPRITE_CLI_PATH_FILE = "cli-path";

export const ASEPRITE_CLI_TIMEOUT_MS = 60_000;
const PATH_LOOKUP_TIMEOUT_MS = 5_000;

export interface AsepriteCliRunner {
  run(
    executable: string,
    args: readonly string[],
  ): Promise<{ stdout: string; stderr: string }>;
}

export interface AsepriteExecutableLookup {
  resolve(): Promise<string | undefined>;
}

export interface PathAsepriteExecutableLookupOptions {
  packageRoot?: string;
  skipPath?: boolean;
  skipWellKnown?: boolean;
}

function whichCommand(): string {
  return process.platform === "win32" ? "where" : "which";
}

function candidateNames(): string[] {
  if (process.platform === "win32") {
    return [
      "aseprite.exe",
      "Aseprite.exe",
      "aseprite",
      "libresprite.exe",
      "LibreSprite.exe",
      "libresprite",
    ];
  }
  return ["aseprite", "libresprite"];
}

function wellKnownPaths(): string[] {
  const home = homedir();
  if (process.platform === "win32") {
    const local = process.env.LOCALAPPDATA ?? path.join(home, "AppData", "Local");
    const programFiles = process.env.ProgramFiles ?? "C:\\Program Files";
    const programFilesX86 =
      process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)";
    return [
      path.join(programFiles, "Aseprite", "Aseprite.exe"),
      path.join(programFilesX86, "Aseprite", "Aseprite.exe"),
      path.join(local, "Programs", "Aseprite", "Aseprite.exe"),
      path.join(
        local,
        "Steam",
        "steamapps",
        "common",
        "Aseprite",
        "Aseprite.exe",
      ),
      path.join(local, "Programs", "LibreSprite", "libresprite.exe"),
      path.join(programFiles, "LibreSprite", "libresprite.exe"),
      path.join(programFilesX86, "LibreSprite", "libresprite.exe"),
    ];
  }
  if (process.platform === "darwin") {
    return [
      "/Applications/Aseprite.app/Contents/MacOS/aseprite",
      path.join(home, "Applications", "Aseprite.app", "Contents", "MacOS", "aseprite"),
      "/Applications/LibreSprite.app/Contents/MacOS/libresprite",
      path.join(
        home,
        "Applications",
        "LibreSprite.app",
        "Contents",
        "MacOS",
        "libresprite",
      ),
    ];
  }
  return [
    "/usr/bin/aseprite",
    "/usr/local/bin/aseprite",
    "/usr/bin/libresprite",
    "/usr/local/bin/libresprite",
  ];
}

function defaultProjectServerRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
}

function isPathInside(root: string, candidate: string): boolean {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  return (
    resolvedCandidate === resolvedRoot ||
    resolvedCandidate.startsWith(resolvedRoot + path.sep)
  );
}

async function isExecutable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.X_OK);
    return true;
  } catch {
    try {
      await access(filePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}

export class PathAsepriteExecutableLookup implements AsepriteExecutableLookup {
  private readonly packageRoot: string;
  private readonly skipPath: boolean;
  private readonly skipWellKnown: boolean;

  constructor(options: PathAsepriteExecutableLookupOptions = {}) {
    this.packageRoot = options.packageRoot ?? defaultProjectServerRoot();
    this.skipPath = options.skipPath === true;
    this.skipWellKnown = options.skipWellKnown === true;
  }

  async resolve(): Promise<string | undefined> {
    const fromEnv = process.env.ASEPRITE;
    if (fromEnv && (await isExecutable(fromEnv))) {
      return fromEnv;
    }

    if (!this.skipPath) {
      for (const name of candidateNames()) {
        try {
          const { stdout } = await execFileAsync(whichCommand(), [name], {
            timeout: PATH_LOOKUP_TIMEOUT_MS,
            windowsHide: true,
          });
          const first = stdout
            .split(/\r?\n/)
            .map((line) => line.trim())
            .find((line) => line.length > 0);
          if (first && (await isExecutable(first))) {
            return first;
          }
        } catch {
          // Not on PATH.
        }
      }
    }

    if (!this.skipWellKnown) {
      for (const candidate of wellKnownPaths()) {
        if (await isExecutable(candidate)) {
          return candidate;
        }
      }
    }

    return this.resolvePackaged();
  }

  private async resolvePackaged(): Promise<string | undefined> {
    const vendor = path.join(this.packageRoot, PACKAGED_LIBRESPRITE_DIR);
    const marker = path.join(vendor, PACKAGED_LIBRESPRITE_CLI_PATH_FILE);
    try {
      const relative = (await readFile(marker, "utf8")).trim();
      if (relative.length > 0 && !path.isAbsolute(relative)) {
        const resolved = path.resolve(vendor, relative);
        if (isPathInside(vendor, resolved) && (await isExecutable(resolved))) {
          return resolved;
        }
      }
    } catch {
      // No packaged install, or marker unreadable.
    }
    for (const name of candidateNames()) {
      const candidate = path.join(vendor, name);
      if (await isExecutable(candidate)) {
        return candidate;
      }
    }
    return undefined;
  }
}

export class ExecFileAsepriteCliRunner implements AsepriteCliRunner {
  async run(
    executable: string,
    args: readonly string[],
  ): Promise<{ stdout: string; stderr: string }> {
    const { stdout, stderr } = await execFileAsync(executable, [...args], {
      timeout: ASEPRITE_CLI_TIMEOUT_MS,
      windowsHide: true,
    });
    return { stdout, stderr };
  }
}

export class AsepriteService {
  private cachedExecutable: string | undefined | null = null;

  constructor(
    private readonly lookup: AsepriteExecutableLookup = new PathAsepriteExecutableLookup(),
    private readonly runner: AsepriteCliRunner = new ExecFileAsepriteCliRunner(),
  ) {}

  async isAvailable(): Promise<boolean> {
    return (await this.resolveExecutable()) !== undefined;
  }

  async resolveExecutable(): Promise<string | undefined> {
    if (this.cachedExecutable !== null) {
      return this.cachedExecutable;
    }
    this.cachedExecutable = (await this.lookup.resolve()) ?? undefined;
    return this.cachedExecutable;
  }

  /**
   * Export a packed PNG + Aseprite json-array data file.
   * Paths must already be project-root confined by the caller.
   */
  async exportSheet(sourcePath: string, sheetPath: string, dataPath: string): Promise<void> {
    const executable = await this.resolveExecutable();
    if (!executable) {
      throw new DomainError("ASEPRITE_CLI_MISSING", ASEPRITE_CLI_MISSING_MESSAGE);
    }
    await this.runner.run(executable, [
      "--batch",
      sourcePath,
      "--sheet",
      sheetPath,
      "--data",
      dataPath,
      "--format",
      "json-array",
      "--list-tags",
      "--sheet-pack",
    ]);
  }
}
