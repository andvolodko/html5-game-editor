import { useCallback, useEffect, useMemo, useState } from "react";
import { getFileBasename, type AssetRecord } from "@game-editor/assets";
import type { SceneListEntry } from "@game-editor/editor-core";
import {
  ASSETS_ROOT_FOLDER,
  SCENES_FOLDER,
  filterAssetsByQuery,
  filterScenesByQuery,
  folderLabel,
  isScenesFolder,
  isScenesFolderOrDescendant,
  isValidSceneFileId,
  joinAssetFolder,
  listFolderEntries,
} from "@game-editor/editor-core";
import { useEditor } from "../editor-context";
import { useEditorState } from "../hooks/useEditorState";

export type BrowserSelection =
  | { kind: "asset"; id: string }
  | { kind: "folder"; path: string }
  | { kind: "scene"; id: string }
  | undefined;

export type RenameTarget =
  | { kind: "asset"; id: string }
  | { kind: "folder"; path: string }
  | { kind: "scene"; id: string }
  | undefined;

export type LeaveSceneGuard = (
  action: () => Promise<void>,
) => Promise<boolean>;

export function useAssetBrowserModel(options?: {
  /** When set, open/create scene run through Save / Don't Save / Cancel first. */
  runGuarded?: LeaveSceneGuard;
}) {
  const editor = useEditor();
  const runGuarded = options?.runGuarded;
  const assets = useEditorState((ed) => ed.assets.getAll());
  const knownFolders = useEditorState((ed) => ed.assets.getFolders());
  const status = useEditorState((ed) => ed.assets.getStatus());
  const error = useEditorState((ed) => ed.assets.getError());
  const activeSceneId = useEditorState((ed) => ed.getSceneFileId());
  const storeVersion = useEditorState((ed) => ed.getStoreVersion());

  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<BrowserSelection>();
  const [renaming, setRenaming] = useState<RenameTarget>();
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set([ASSETS_ROOT_FOLDER, SCENES_FOLDER]),
  );
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderMessage, setFolderMessage] = useState<string | null>(null);
  const [scenes, setScenes] = useState<SceneListEntry[]>([]);
  const [scenesError, setScenesError] = useState<string | null>(null);

  const searching = query.trim().length > 0;

  const refreshScenes = useCallback(async () => {
    try {
      const listed = await editor.listScenes();
      setScenes(listed);
      setScenesError(null);
    } catch (err) {
      setScenesError(err instanceof Error ? err.message : "Failed to list scenes");
    }
  }, [editor]);

  useEffect(() => {
    void refreshScenes();
  }, [refreshScenes, storeVersion, activeSceneId]);

  const searchAssets = useMemo(() => {
    if (!searching) {
      return [];
    }
    return filterAssetsByQuery(assets, query);
  }, [assets, query, searching]);

  const searchScenes = useMemo(() => {
    if (!searching) {
      return [];
    }
    return filterScenesByQuery(scenes, query);
  }, [scenes, query, searching]);

  const rootEntries = useMemo(
    () => listFolderEntries(assets, ASSETS_ROOT_FOLDER, knownFolders, scenes),
    [assets, knownFolders, scenes],
  );

  const folderParentForCreate = useMemo(() => {
    if (selection?.kind === "folder") {
      if (isScenesFolderOrDescendant(selection.path)) {
        return ASSETS_ROOT_FOLDER;
      }
      return selection.path;
    }
    if (selection?.kind === "asset") {
      const asset = assets.find((a) => a.id === selection.id);
      if (asset?.path.includes("/")) {
        return asset.path.slice(0, asset.path.lastIndexOf("/"));
      }
    }
    return ASSETS_ROOT_FOLDER;
  }, [assets, selection]);

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const createFolder = async (): Promise<boolean> => {
    setFolderMessage(null);
    try {
      if (isScenesFolderOrDescendant(folderParentForCreate)) {
        setFolderMessage("Cannot create folders under assets/scenes");
        return false;
      }
      const folderPath = joinAssetFolder(folderParentForCreate, newFolderName);
      await editor.assets.createFolder(folderPath);
      setExpanded((prev) => new Set(prev).add(folderParentForCreate).add(folderPath));
      setNewFolderName("");
      setCreatingFolder(false);
      setSelection({ kind: "folder", path: folderPath });
      return true;
    } catch (err) {
      setFolderMessage(err instanceof Error ? err.message : "Create folder failed");
      return false;
    }
  };

  const renameAsset = async (assetId: string, name: string): Promise<boolean> => {
    setFolderMessage(null);
    try {
      await editor.assets.renameAsset(assetId, name);
      setRenaming(undefined);
      return true;
    } catch (err) {
      setFolderMessage(err instanceof Error ? err.message : "Rename failed");
      return false;
    }
  };

  const renameFolder = async (folderPath: string, name: string): Promise<boolean> => {
    setFolderMessage(null);
    try {
      if (isScenesFolder(folderPath)) {
        setFolderMessage("Cannot rename the reserved scenes folder");
        return false;
      }
      const next = await editor.assets.renameFolder(folderPath, name);
      setExpanded((prev) => {
        const updated = new Set<string>();
        for (const key of prev) {
          if (key === folderPath || key.startsWith(`${folderPath}/`)) {
            updated.add(`${next}${key.slice(folderPath.length)}`);
          } else {
            updated.add(key);
          }
        }
        updated.add(next);
        return updated;
      });
      setSelection({ kind: "folder", path: next });
      setRenaming(undefined);
      return true;
    } catch (err) {
      setFolderMessage(err instanceof Error ? err.message : "Rename folder failed");
      return false;
    }
  };

  const moveAsset = async (assetId: string, destination: string): Promise<boolean> => {
    setFolderMessage(null);
    try {
      if (isScenesFolderOrDescendant(destination)) {
        setFolderMessage("Cannot move textures into assets/scenes");
        return false;
      }
      await editor.assets.moveAsset(assetId, destination);
      setExpanded((prev) => new Set(prev).add(destination));
      setSelection({ kind: "asset", id: assetId });
      return true;
    } catch (err) {
      setFolderMessage(err instanceof Error ? err.message : "Move failed");
      return false;
    }
  };

  const removeAsset = async (assetId: string): Promise<boolean> => {
    setFolderMessage(null);
    try {
      await editor.assets.deleteAsset(assetId);
      setSelection((prev) =>
        prev?.kind === "asset" && prev.id === assetId ? undefined : prev,
      );
      setRenaming((prev) =>
        prev?.kind === "asset" && prev.id === assetId ? undefined : prev,
      );
      return true;
    } catch (err) {
      setFolderMessage(err instanceof Error ? err.message : "Remove failed");
      return false;
    }
  };

  const removeFolder = async (folderPath: string): Promise<boolean> => {
    setFolderMessage(null);
    try {
      if (folderPath === ASSETS_ROOT_FOLDER || isScenesFolderOrDescendant(folderPath)) {
        setFolderMessage("Cannot remove this folder");
        return false;
      }
      await editor.assets.deleteFolder(folderPath);
      setExpanded((prev) => {
        const next = new Set<string>();
        for (const key of prev) {
          if (key === folderPath || key.startsWith(`${folderPath}/`)) {
            continue;
          }
          next.add(key);
        }
        return next;
      });
      setSelection((prev) => {
        if (prev?.kind === "folder" && (prev.path === folderPath || prev.path.startsWith(`${folderPath}/`))) {
          return undefined;
        }
        if (prev?.kind === "asset") {
          const asset = editor.assets.get(prev.id);
          if (!asset) {
            return undefined;
          }
        }
        return prev;
      });
      setRenaming(undefined);
      return true;
    } catch (err) {
      setFolderMessage(err instanceof Error ? err.message : "Remove folder failed");
      return false;
    }
  };

  const removeScene = async (sceneId: string): Promise<boolean> => {
    setFolderMessage(null);

    const performRemove = async (): Promise<boolean> => {
      const listed = await editor.listScenes();
      if (listed.length <= 1) {
        setFolderMessage("Cannot remove the last scene");
        return false;
      }
      const fallback = listed.find((entry) => entry.id !== sceneId);
      if (!fallback) {
        setFolderMessage("Cannot remove the last scene");
        return false;
      }
      await editor.deleteSceneFile(sceneId, fallback.id);
      setSelection((prev) =>
        prev?.kind === "scene" && prev.id === sceneId
          ? { kind: "scene", id: fallback.id }
          : prev,
      );
      setRenaming(undefined);
      await refreshScenes();
      return true;
    };

    try {
      if (sceneId === editor.getSceneFileId() && runGuarded) {
        let removed = false;
        const proceeded = await runGuarded(async () => {
          removed = await performRemove();
        });
        return proceeded && removed;
      }
      return await performRemove();
    } catch (err) {
      setFolderMessage(err instanceof Error ? err.message : "Remove scene failed");
      return false;
    }
  };

  const openScene = async (sceneId: string): Promise<void> => {
    setFolderMessage(null);
    if (sceneId === editor.getSceneFileId()) {
      setSelection({ kind: "scene", id: sceneId });
      return;
    }

    const switchToScene = async (): Promise<void> => {
      await editor.loadScene(sceneId);
      setSelection({ kind: "scene", id: sceneId });
    };

    try {
      if (runGuarded) {
        await runGuarded(switchToScene);
        return;
      }
      await switchToScene();
    } catch (err) {
      setFolderMessage(err instanceof Error ? err.message : "Open scene failed");
    }
  };

  const renameScene = async (sceneId: string, nextId: string): Promise<boolean> => {
    setFolderMessage(null);
    const trimmed = nextId.trim();
    if (!isValidSceneFileId(trimmed)) {
      setFolderMessage(
        "Invalid scene name. Use letters, numbers, dots, underscores, or hyphens.",
      );
      return false;
    }
    try {
      const entry = await editor.renameSceneFile(sceneId, trimmed);
      setSelection({ kind: "scene", id: entry.id });
      setRenaming(undefined);
      await refreshScenes();
      return true;
    } catch (err) {
      setFolderMessage(err instanceof Error ? err.message : "Rename scene failed");
      return false;
    }
  };

  const createScene = async (): Promise<boolean> => {
    setFolderMessage(null);

    const createAndOpen = async (): Promise<boolean> => {
      const defaultId = await editor.allocateSceneFileId();
      const rawId = window.prompt("Scene file name (without .json):", defaultId);
      if (rawId === null) {
        return false;
      }
      const sceneId = rawId.trim();
      if (sceneId.length === 0) {
        setFolderMessage("Scene name is required");
        return false;
      }
      if (!isValidSceneFileId(sceneId)) {
        setFolderMessage(
          "Invalid scene name. Use letters, numbers, dots, underscores, or hyphens.",
        );
        return false;
      }
      await editor.createScene(sceneId, sceneId);
      setExpanded((prev) => new Set(prev).add(ASSETS_ROOT_FOLDER).add(SCENES_FOLDER));
      setSelection({ kind: "scene", id: sceneId });
      await refreshScenes();
      return true;
    };

    try {
      if (runGuarded) {
        let created = false;
        const proceeded = await runGuarded(async () => {
          created = await createAndOpen();
        });
        return proceeded && created;
      }
      return await createAndOpen();
    } catch (err) {
      setFolderMessage(err instanceof Error ? err.message : "Create scene failed");
      return false;
    }
  };

  const contentUrl = (asset: AssetRecord) => {
    if (asset.metadata.kind === "spine") {
      const page = asset.metadata.pagePaths[0];
      if (!page) {
        return undefined;
      }
      return editor.assets.resolveSpinePartUrl(asset.id, getFileBasename(page));
    }
    return editor.assets.getContentUrl(asset.id);
  };

  const entriesForFolder = (folderPath: string) =>
    listFolderEntries(assets, folderPath, knownFolders, scenes);

  return {
    editor,
    assets,
    rootEntries,
    searchAssets,
    searchScenes,
    scenes,
    scenesError,
    activeSceneId,
    status,
    error,
    query,
    setQuery,
    searching,
    selection,
    setSelection,
    renaming,
    setRenaming,
    expanded,
    toggleExpanded,
    setExpanded,
    creatingFolder,
    setCreatingFolder,
    newFolderName,
    setNewFolderName,
    createFolder,
    folderParentForCreate,
    folderMessage,
    setFolderMessage,
    folderLabel,
    renameAsset,
    renameFolder,
    renameScene,
    moveAsset,
    removeAsset,
    removeFolder,
    removeScene,
    openScene,
    createScene,
    contentUrl,
    entriesForFolder,
    refreshScenes,
    importDestination: isScenesFolderOrDescendant(folderParentForCreate)
      ? ASSETS_ROOT_FOLDER
      : folderParentForCreate,
  };
}
