/**
 * Disk + catalogue mutations for undoable asset/folder rename/delete/duplicate.
 * Implemented by Editor; commands must not call React or renderers.
 */
export interface AssetHistoryHost {
  renameAssetOnDisk(assetId: string, name: string): Promise<void>;
  deleteAssetOnDisk(assetId: string): Promise<void>;
  restoreAssetOnDisk(assetId: string): Promise<void>;
  renameFolderOnDisk(folderPath: string, name: string): Promise<void>;
  deleteFolderOnDisk(folderPath: string): Promise<void>;
  restoreFolderOnDisk(folderPath: string): Promise<void>;
}

export function posixPathBasename(assetPath: string): string {
  const slash = assetPath.lastIndexOf("/");
  return slash >= 0 ? assetPath.slice(slash + 1) : assetPath;
}
