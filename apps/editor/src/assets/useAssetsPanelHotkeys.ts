import { useEffect, useRef, type RefObject } from "react";
import {
  ASSETS_ROOT_FOLDER,
  assetBrowserEntryItem,
  assetBrowserItemKey,
  assetBrowserItemParent,
  isChordLetter,
  isEditableDomTarget,
  isFolderOrDescendant,
  isScenesFolder,
  isScenesFolderOrDescendant,
  parentFolder,
  parseAssetBrowserItemKey,
  resolveTreeKeyboardIntent,
  rootMostFolderPaths,
} from "@game-editor/editor-core";
import type { useAssetBrowserModel } from "./useAssetBrowserModel";

/** Catalogue copy buffer for Assets panel Ctrl+C / Ctrl+V. */
type CatalogueClipboard =
  | { kind: "assets"; ids: readonly string[] }
  | { kind: "scenes"; ids: readonly string[] };

function scrollBrowserItemIntoView(
  tree: HTMLElement | null,
  item: { kind: "asset" | "scene"; id: string } | { kind: "folder"; path: string },
): void {
  if (!tree) {
    return;
  }
  const attr =
    item.kind === "folder"
      ? "data-folder-path"
      : item.kind === "asset"
        ? "data-asset-id"
        : "data-scene-id";
  const value = item.kind === "folder" ? item.path : item.id;
  const row = tree.querySelector(`[${attr}="${CSS.escape(value)}"]`);
  row?.scrollIntoView({ block: "nearest" });
}

function setPathExpanded(
  model: ReturnType<typeof useAssetBrowserModel>,
  path: string,
  expanded: boolean,
): void {
  model.setExpanded((previous) => {
    if (previous.has(path) === expanded) {
      return previous;
    }
    const next = new Set(previous);
    if (expanded) {
      next.add(path);
    } else {
      next.delete(path);
    }
    return next;
  });
}

export function useAssetsPanelHotkeys(
  model: ReturnType<typeof useAssetBrowserModel>,
  panelFocused: boolean,
  treeRef: RefObject<HTMLDivElement | null>,
  options?: {
    confirmDeleteAssets?: (assetIds: readonly string[]) => Promise<boolean>;
  },
): void {
  const copiedCatalogueRef = useRef<CatalogueClipboard | undefined>(undefined);

  useEffect(() => {
    const selection = model.selection;
    if (!selection) {
      return;
    }
    scrollBrowserItemIntoView(treeRef.current, selection);
  }, [model.expanded, model.selection, treeRef]);

  useEffect(() => {
    if (!panelFocused) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableDomTarget(event.target) || model.renaming) {
        return;
      }

      const mod = event.ctrlKey || event.metaKey;
      if (mod && isChordLetter(event, "KeyC", "c") && !event.shiftKey && !event.altKey) {
        const assetIds = model.selectedItems
          .filter((item) => item.kind === "asset")
          .map((item) => item.id);
        const sceneIds = model.selectedItems
          .filter((item) => item.kind === "scene")
          .map((item) => item.id);
        if (assetIds.length > 0) {
          event.preventDefault();
          copiedCatalogueRef.current = { kind: "assets", ids: assetIds };
        } else if (sceneIds.length > 0) {
          event.preventDefault();
          copiedCatalogueRef.current = { kind: "scenes", ids: sceneIds };
        }
        return;
      }
      if (mod && isChordLetter(event, "KeyV", "v") && !event.shiftKey && !event.altKey) {
        const copied = copiedCatalogueRef.current;
        if (copied?.kind === "assets") {
          event.preventDefault();
          for (const id of copied.ids) {
            void model.duplicateAsset(id, model.importDestination);
          }
        } else if (copied?.kind === "scenes") {
          event.preventDefault();
          for (const id of copied.ids) {
            void model.duplicateScene(id);
          }
        }
        return;
      }

      if (event.key === "F2") {
        if (model.selection?.kind === "asset") {
          event.preventDefault();
          model.setRenaming({ kind: "asset", id: model.selection.id });
        } else if (model.selection?.kind === "scene") {
          event.preventDefault();
          model.setRenaming({ kind: "scene", id: model.selection.id });
        } else if (
          model.selection?.kind === "folder" &&
          model.selection.path !== ASSETS_ROOT_FOLDER &&
          !isScenesFolder(model.selection.path)
        ) {
          event.preventDefault();
          model.setRenaming({ kind: "folder", path: model.selection.path });
        }
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (model.selectedItems.length === 0) {
          return;
        }
        event.preventDefault();
        void removeSelectedCatalogueItems(model, options?.confirmDeleteAssets);
        return;
      }

      const selection = model.selection;
      const visibleKeys = model.visibleItems.map(assetBrowserItemKey);
      const currentKey = selection
        ? assetBrowserItemKey(selection)
        : undefined;
      const isFolder = selection?.kind === "folder";
      const folderEntries = isFolder
        ? model.entriesForFolder(selection.path)
        : [];
      const parent = selection
        ? assetBrowserItemParent(selection, model.assets)
        : undefined;
      const parentKey = parent ? assetBrowserItemKey(parent) : undefined;
      const firstChild = folderEntries[0]
        ? assetBrowserEntryItem(folderEntries[0])
        : undefined;
      const intent = resolveTreeKeyboardIntent({
        key: event.key,
        code: event.code,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        visibleIds: visibleKeys,
        currentId: currentKey,
        expanded: isFolder ? model.expanded.has(selection.path) : false,
        hasChildren: isFolder,
        parentId:
          parentKey !== undefined && visibleKeys.includes(parentKey)
            ? parentKey
            : undefined,
        firstChildId: firstChild
          ? assetBrowserItemKey(firstChild)
          : undefined,
        expandEnabled: !model.searching,
      });
      if (!intent) {
        return;
      }
      event.preventDefault();

      if (intent.type === "select") {
        const item = parseAssetBrowserItemKey(intent.id);
        if (!item) {
          return;
        }
        model.selectItem(item, {
          shiftKey: event.shiftKey,
          ctrlKey: false,
          metaKey: false,
        });
        return;
      }
      if (intent.type === "select-all") {
        model.replaceSelection(model.visibleItems);
        return;
      }
      if (!isFolder || !selection || selection.kind !== "folder") {
        if (intent.type === "activate" && selection?.kind === "scene") {
          void model.openScene(selection.id);
        } else if (intent.type === "activate" && selection?.kind === "asset") {
          const asset = model.editor.assets.get(selection.id);
          if (asset?.type === "prefab") {
            void model.editor.openPrefab(selection.id).catch(() => undefined);
          }
        }
        return;
      }
      if (intent.type === "expand") {
        setPathExpanded(model, selection.path, true);
        return;
      }
      if (intent.type === "collapse") {
        setPathExpanded(model, selection.path, false);
        return;
      }
      if (intent.type === "toggle-expand") {
        model.toggleExpanded(selection.path);
        return;
      }
      if (intent.type === "activate") {
        setPathExpanded(model, selection.path, true);
        if (firstChild) {
          model.setSelection(firstChild);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [model, options?.confirmDeleteAssets, panelFocused]);
}

async function removeSelectedCatalogueItems(
  model: ReturnType<typeof useAssetBrowserModel>,
  confirmDeleteAssets?: (assetIds: readonly string[]) => Promise<boolean>,
): Promise<void> {
  const folderPaths = rootMostFolderPaths(
    model.selectedItems
      .filter((item) => item.kind === "folder")
      .map((item) => item.path)
      .filter(
        (path) =>
          path !== ASSETS_ROOT_FOLDER && !isScenesFolderOrDescendant(path),
      ),
  );
  const assetsToRemove = model.selectedItems
    .filter((item) => item.kind === "asset")
    .map((item) => item.id)
    .filter((assetId) => {
      const asset = model.editor.assets.get(assetId);
      if (!asset) {
        return false;
      }
      const folder = parentFolder(asset.path);
      return !folderPaths.some(
        (path) => path === folder || isFolderOrDescendant(path, folder),
      );
    });
  const scenesToRemove = model.selectedItems
    .filter((item) => item.kind === "scene")
    .map((item) => item.id);

  if (assetsToRemove.length > 0 && confirmDeleteAssets) {
    const confirmed = await confirmDeleteAssets(assetsToRemove);
    if (!confirmed) {
      return;
    }
  }

  for (const path of folderPaths) {
    await model.removeFolder(path);
  }
  for (const assetId of assetsToRemove) {
    await model.removeAsset(assetId);
  }
  for (const sceneId of scenesToRemove) {
    await model.removeScene(sceneId);
  }
}
