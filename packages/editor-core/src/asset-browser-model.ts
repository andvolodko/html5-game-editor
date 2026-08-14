import { getFileBasename, type AssetRecord } from "@game-editor/assets";

export const ASSETS_ROOT_FOLDER = "assets";

/** Reserved folder for scene JSON files (SceneFileService), not texture assets. */
export const SCENES_FOLDER = "assets/scenes";

export function isScenesFolder(folderPath: string): boolean {
  return folderPath === SCENES_FOLDER;
}

/** True when `folderPath` is the scenes folder or nested under it. */
export function isScenesFolderOrDescendant(folderPath: string): boolean {
  return isFolderOrDescendant(SCENES_FOLDER, folderPath);
}

/**
 * Pure folder browser helpers for the Asset Browser (testable, UI-agnostic).
 */
export function parentFolder(folderPath: string): string {
  if (!folderPath || folderPath === ASSETS_ROOT_FOLDER) {
    return ASSETS_ROOT_FOLDER;
  }
  const parts = folderPath.split("/").filter(Boolean);
  if (parts.length <= 1) {
    return ASSETS_ROOT_FOLDER;
  }
  return parts.slice(0, -1).join("/");
}

export function listChildFolders(
  assets: readonly AssetRecord[],
  currentFolder: string,
  knownFolders: readonly string[] = [],
): string[] {
  const prefix = currentFolder.endsWith("/")
    ? currentFolder
    : `${currentFolder}/`;
  const set = new Set<string>();
  for (const asset of assets) {
    if (!asset.path.startsWith(prefix)) {
      continue;
    }
    const rest = asset.path.slice(prefix.length);
    const slash = rest.indexOf("/");
    if (slash > 0) {
      set.add(`${currentFolder}/${rest.slice(0, slash)}`);
    }
  }
  for (const folder of knownFolders) {
    if (folder !== currentFolder && parentFolder(folder) === currentFolder) {
      set.add(folder);
    }
  }
  // Always surface the reserved scenes folder under assets/.
  if (currentFolder === ASSETS_ROOT_FOLDER) {
    set.add(SCENES_FOLDER);
  }
  return [...set].sort();
}

export function listAssetsInFolder(
  assets: readonly AssetRecord[],
  currentFolder: string,
): AssetRecord[] {
  return assets.filter((asset) => {
    const dir = asset.path.includes("/")
      ? asset.path.slice(0, asset.path.lastIndexOf("/"))
      : "";
    return dir === currentFolder;
  });
}

export function filterAssetsByQuery(
  assets: readonly AssetRecord[],
  query: string,
): AssetRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [...assets];
  }
  return assets.filter(
    (asset) =>
      asset.name.toLowerCase().includes(q) ||
      asset.path.toLowerCase().includes(q) ||
      asset.id.toLowerCase().includes(q),
  );
}

export function filterScenesByQuery(
  scenes: readonly { id: string; path: string }[],
  query: string,
): Array<{ id: string; path: string }> {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [...scenes];
  }
  return scenes.filter(
    (scene) =>
      scene.id.toLowerCase().includes(q) || scene.path.toLowerCase().includes(q),
  );
}

export function folderLabel(folderPath: string): string {
  const parts = folderPath.split("/");
  return parts[parts.length - 1] ?? folderPath;
}

export type AssetBrowserEntry =
  | { kind: "folder"; path: string; name: string }
  | { kind: "asset"; asset: AssetRecord }
  | { kind: "scene"; id: string; path: string };

/**
 * Children of a folder for a tree Asset Browser: folders first, then assets.
 * When `currentFolder` is the scenes folder, appends scene file entries.
 */
export function listFolderEntries(
  assets: readonly AssetRecord[],
  currentFolder: string,
  knownFolders: readonly string[] = [],
  scenes: readonly { id: string; path: string }[] = [],
): AssetBrowserEntry[] {
  const folders = listChildFolders(assets, currentFolder, knownFolders).map(
    (pathValue): AssetBrowserEntry => ({
      kind: "folder",
      path: pathValue,
      name: folderLabel(pathValue),
    }),
  );
  const files = listAssetsInFolder(assets, currentFolder)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((asset): AssetBrowserEntry => ({ kind: "asset", asset }));

  const sceneEntries: AssetBrowserEntry[] = isScenesFolder(currentFolder)
    ? scenes
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((scene) => ({ kind: "scene" as const, id: scene.id, path: scene.path }))
    : [];

  return [...folders, ...files, ...sceneEntries];
}

/**
 * Join a child folder name under a parent. Rejects nested/relative segments.
 */
export function joinAssetFolder(
  parentFolderPath: string,
  childName: string,
): string {
  const name = childName.trim();
  if (!name || name.includes("/") || name.includes("\\") || name === "." || name === "..") {
    throw new Error("Invalid folder name");
  }
  const parent =
    !parentFolderPath || parentFolderPath.length === 0
      ? ASSETS_ROOT_FOLDER
      : parentFolderPath;
  return `${parent}/${name}`;
}

/** True when `candidate` is `folder` or a descendant of `folder`. */
export function isFolderOrDescendant(folder: string, candidate: string): boolean {
  return folder === candidate || candidate.startsWith(`${folder}/`);
}

export interface AssetBrowserPreviewResolvers {
  contentUrl: (assetId: string) => string | undefined;
  spinePartUrl: (assetId: string, pageBasename: string) => string | undefined;
  fontPartUrl: (assetId: string, pageBasename: string) => string | undefined;
  asepritePartUrl: (assetId: string, partBasename: string) => string | undefined;
}

/**
 * Raster thumbnail URL for the Asset Browser `<img>`.
 * GLB/glTF and audio bytes are not images — loading them as `<img>` shows the
 * browser broken-image icon instead of the type glyph.
 */
export function resolveAssetBrowserPreviewUrl(
  asset: AssetRecord,
  resolvers: AssetBrowserPreviewResolvers,
): string | undefined {
  switch (asset.metadata.kind) {
    case "texture":
      return resolvers.contentUrl(asset.id);
    case "spine": {
      const page = asset.metadata.pagePaths[0];
      if (!page) {
        return undefined;
      }
      return resolvers.spinePartUrl(asset.id, getFileBasename(page));
    }
    case "font": {
      const page = asset.metadata.pagePaths[0];
      if (!page) {
        return undefined;
      }
      return resolvers.fontPartUrl(asset.id, getFileBasename(page));
    }
    case "aseprite":
      return resolvers.asepritePartUrl(
        asset.id,
        getFileBasename(asset.metadata.sheetPath),
      );
    case "audio":
    case "gltf":
    case "webfont":
      return undefined;
  }
}
