import { access, mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import {
  AssetDatabase,
  createEmptyAssetDatabase,
  serializeAssetDatabase,
  type AssetDatabaseData,
} from "@game-editor/assets";
import type { ProjectService } from "./project-service.js";

export const ASSET_MANIFEST_RELATIVE_PATH = ".project/assets.json";

export class AssetDatabaseStore {
  constructor(private readonly projectService: ProjectService) {}

  private manifestAbsolute(): string {
    return this.projectService.resolveProjectPath(ASSET_MANIFEST_RELATIVE_PATH);
  }

  async load(): Promise<AssetDatabase> {
    const absolute = this.manifestAbsolute();
    try {
      const raw = await readFile(absolute, "utf8");
      return AssetDatabase.fromUnknown(JSON.parse(raw) as unknown);
    } catch {
      return new AssetDatabase(createEmptyAssetDatabase());
    }
  }

  async save(database: AssetDatabase): Promise<AssetDatabaseData> {
    const absolute = this.manifestAbsolute();
    await mkdir(path.dirname(absolute), { recursive: true });
    const payload = serializeAssetDatabase(database.toJSON());
    const temp = `${absolute}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temp, payload, "utf8");
    await rename(temp, absolute);
    return database.toJSON();
  }

  async exists(relativePath: string): Promise<boolean> {
    const absolute = this.projectService.resolveProjectPath(relativePath);
    try {
      await access(absolute);
      return true;
    } catch {
      return false;
    }
  }
}
