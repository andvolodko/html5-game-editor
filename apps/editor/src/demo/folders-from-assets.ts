import { ASSETS_ROOT_FOLDER, SCENES_FOLDER } from "@game-editor/editor-core";
import type { AssetDatabaseData } from "@game-editor/assets";

/** Folder entries implied by asset paths, plus the reserved scenes folder. */
export function foldersFromAssetDatabase(
  database: AssetDatabaseData,
): string[] {
  const folders = new Set<string>([ASSETS_ROOT_FOLDER, SCENES_FOLDER]);
  for (const asset of database.assets) {
    const parts = asset.path.replaceAll("\\", "/").split("/").filter(Boolean);
    for (let index = 1; index < parts.length; index += 1) {
      folders.add(parts.slice(0, index).join("/"));
    }
  }
  return [...folders].sort();
}
