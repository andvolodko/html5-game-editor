import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ProjectService } from "./project-service.js";

export const ASEPRITE_CACHE_VERSION = 3 as const;
export const ASEPRITE_CACHE_RELATIVE_PATH = ".project/aseprite-cache.json";

export interface AsepriteCacheEntry {
  source: string;
  sourceMtime: number;
  sourceSize: number;
  generatedFiles: string[];
  compileRevision: string;
}

export interface AsepriteCacheData {
  version: typeof ASEPRITE_CACHE_VERSION;
  entries: Record<string, AsepriteCacheEntry>;
}

function isCacheEntry(value: unknown): value is AsepriteCacheEntry {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.source === "string" &&
    record.source.length > 0 &&
    typeof record.sourceMtime === "number" &&
    typeof record.sourceSize === "number" &&
    record.sourceSize >= 0 &&
    typeof record.compileRevision === "string" &&
    record.compileRevision.length > 0 &&
    Array.isArray(record.generatedFiles) &&
    record.generatedFiles.every(
      (item) => typeof item === "string" && item.length > 0,
    )
  );
}

function parseCacheData(value: unknown): AsepriteCacheData | undefined {
  if (value === null || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (record.version !== ASEPRITE_CACHE_VERSION) {
    return undefined;
  }
  if (record.entries === null || typeof record.entries !== "object") {
    return undefined;
  }
  const entries: Record<string, AsepriteCacheEntry> = {};
  for (const [key, entry] of Object.entries(
    record.entries as Record<string, unknown>,
  )) {
    if (!isCacheEntry(entry)) {
      return undefined;
    }
    entries[key] = entry;
  }
  return { version: ASEPRITE_CACHE_VERSION, entries };
}

export class AsepriteCacheStore {
  constructor(private readonly projectService: ProjectService) {}

  async load(): Promise<AsepriteCacheData> {
    const absolute = this.projectService.resolveProjectPath(
      ASEPRITE_CACHE_RELATIVE_PATH,
    );
    try {
      const raw = await readFile(absolute, "utf8");
      return parseCacheData(JSON.parse(raw) as unknown) ?? {
        version: ASEPRITE_CACHE_VERSION,
        entries: {},
      };
    } catch {
      return { version: ASEPRITE_CACHE_VERSION, entries: {} };
    }
  }

  async save(data: AsepriteCacheData): Promise<void> {
    const absolute = this.projectService.resolveProjectPath(
      ASEPRITE_CACHE_RELATIVE_PATH,
    );
    await mkdir(path.dirname(absolute), { recursive: true });
    const normalized: AsepriteCacheData = {
      version: ASEPRITE_CACHE_VERSION,
      entries: Object.fromEntries(
        Object.entries(data.entries).sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      ),
    };
    await writeFile(
      absolute,
      `${JSON.stringify(normalized, null, 2)}\n`,
      "utf8",
    );
  }

  isFresh(
    entry: AsepriteCacheEntry | undefined,
    sourceMtime: number,
    sourceSize: number,
  ): boolean {
    if (!entry) {
      return false;
    }
    return entry.sourceMtime === sourceMtime && entry.sourceSize === sourceSize;
  }
}
