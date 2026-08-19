import type { AssetRecord } from "@game-editor/assets";
import {
  ASSETS_ROOT_FOLDER,
  SCENES_FOLDER,
  isFolderOrDescendant,
  listFolderEntries,
  parentFolder,
  type AssetBrowserEntry,
} from "./asset-browser-model.js";

export type AssetBrowserSelectionItem =
  | { kind: "asset"; id: string }
  | { kind: "folder"; path: string }
  | { kind: "scene"; id: string };

export function assetBrowserItemKey(item: AssetBrowserSelectionItem): string {
  if (item.kind === "folder") {
    return `folder:${item.path}`;
  }
  return `${item.kind}:${item.id}`;
}

export function parseAssetBrowserItemKey(
  key: string,
): AssetBrowserSelectionItem | undefined {
  if (key.startsWith("folder:")) {
    return { kind: "folder", path: key.slice("folder:".length) };
  }
  if (key.startsWith("asset:")) {
    return { kind: "asset", id: key.slice("asset:".length) };
  }
  if (key.startsWith("scene:")) {
    return { kind: "scene", id: key.slice("scene:".length) };
  }
  return undefined;
}

export function assetBrowserItemsEqual(
  left: AssetBrowserSelectionItem,
  right: AssetBrowserSelectionItem,
): boolean {
  return assetBrowserItemKey(left) === assetBrowserItemKey(right);
}

export function assetBrowserEntryItem(
  entry: AssetBrowserEntry,
): AssetBrowserSelectionItem {
  if (entry.kind === "folder") {
    return { kind: "folder", path: entry.path };
  }
  if (entry.kind === "scene") {
    return { kind: "scene", id: entry.id };
  }
  return { kind: "asset", id: entry.asset.id };
}

/** Parent folder row for a catalogue item, if any. */
export function assetBrowserItemParent(
  item: AssetBrowserSelectionItem,
  assets: readonly AssetRecord[],
): AssetBrowserSelectionItem | undefined {
  if (item.kind === "folder") {
    if (item.path === ASSETS_ROOT_FOLDER) {
      return undefined;
    }
    return { kind: "folder", path: parentFolder(item.path) };
  }
  if (item.kind === "asset") {
    const asset = assets.find((entry) => entry.id === item.id);
    if (!asset) {
      return undefined;
    }
    return { kind: "folder", path: parentFolder(asset.path) };
  }
  return { kind: "folder", path: SCENES_FOLDER };
}

/**
 * Depth-first catalogue rows currently shown (expanded folders only).
 * Search mode should pass a flat list instead.
 */
export function flattenVisibleBrowserItems(
  assets: readonly AssetRecord[],
  knownFolders: readonly string[],
  scenes: readonly { id: string; path: string }[],
  expanded: ReadonlySet<string>,
): AssetBrowserSelectionItem[] {
  const items: AssetBrowserSelectionItem[] = [];
  const walk = (folderPath: string) => {
    items.push({ kind: "folder", path: folderPath });
    if (!expanded.has(folderPath)) {
      return;
    }
    for (const entry of listFolderEntries(
      assets,
      folderPath,
      knownFolders,
      scenes,
    )) {
      if (entry.kind === "folder") {
        walk(entry.path);
      } else if (entry.kind === "asset") {
        items.push({ kind: "asset", id: entry.asset.id });
      } else {
        items.push({ kind: "scene", id: entry.id });
      }
    }
  };
  walk(ASSETS_ROOT_FOLDER);
  return items;
}

/** Folders that are not nested under another selected folder. */
export function rootMostFolderPaths(paths: readonly string[]): string[] {
  return paths.filter(
    (path) =>
      !paths.some((other) => other !== path && isFolderOrDescendant(other, path)),
  );
}
