import { useCallback, useRef, useState } from "react";
import type { AssetRecord } from "@game-editor/assets";
import {
  applyListSelection,
  ASSETS_ROOT_FOLDER,
  assetBrowserItemKey,
  assetBrowserItemsEqual,
  isToggleSelectionKey,
  parseAssetBrowserItemKey,
  type AssetBrowserSelectionItem,
} from "@game-editor/editor-core";

function itemExists(
  item: AssetBrowserSelectionItem,
  assets: readonly AssetRecord[],
  knownFolders: readonly string[],
  scenes: readonly { id: string }[],
): boolean {
  if (item.kind === "asset") {
    return assets.some((asset) => asset.id === item.id);
  }
  if (item.kind === "scene") {
    return scenes.some((scene) => scene.id === item.id);
  }
  if (item.path === ASSETS_ROOT_FOLDER) {
    return true;
  }
  if (knownFolders.includes(item.path)) {
    return true;
  }
  return assets.some(
    (asset) =>
      asset.path.startsWith(`${item.path}/`) ||
      asset.path.slice(0, asset.path.lastIndexOf("/")) === item.path,
  );
}

export function useAssetBrowserSelection(
  visibleItems: readonly AssetBrowserSelectionItem[],
) {
  const [selectedItems, setSelectedItems] = useState<
    AssetBrowserSelectionItem[]
  >([]);
  const [anchor, setAnchor] = useState<AssetBrowserSelectionItem | undefined>();
  const selectedItemsRef = useRef(selectedItems);
  selectedItemsRef.current = selectedItems;

  const selection = selectedItems[selectedItems.length - 1];

  const replaceSelection = useCallback((items: readonly AssetBrowserSelectionItem[]) => {
    const next = [...items];
    selectedItemsRef.current = next;
    setSelectedItems(next);
    setAnchor(next[next.length - 1]);
  }, []);

  const setSelection = useCallback((item: AssetBrowserSelectionItem | undefined) => {
    replaceSelection(item ? [item] : []);
  }, [replaceSelection]);

  const isSelected = useCallback(
    (item: AssetBrowserSelectionItem) =>
      selectedItems.some((entry) => assetBrowserItemsEqual(entry, item)),
    [selectedItems],
  );

  const selectItem = useCallback(
    (
      item: AssetBrowserSelectionItem,
      event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
    ) => {
      const toggleKey = isToggleSelectionKey(event);
      const current = selectedItemsRef.current;
      if (
        !toggleKey &&
        !event.shiftKey &&
        current.some((entry) => assetBrowserItemsEqual(entry, item)) &&
        current.length > 1
      ) {
        return;
      }
      const next = applyListSelection(
        visibleItems.map(assetBrowserItemKey),
        current.map(assetBrowserItemKey),
        assetBrowserItemKey(item),
        { shiftKey: event.shiftKey, toggleKey },
        anchor ? assetBrowserItemKey(anchor) : undefined,
      );
      const mapped = next.selected
        .map(parseAssetBrowserItemKey)
        .filter((entry): entry is AssetBrowserSelectionItem => entry !== undefined);
      selectedItemsRef.current = mapped;
      setSelectedItems(mapped);
      setAnchor(parseAssetBrowserItemKey(next.anchor));
    },
    [anchor, visibleItems],
  );

  const assetIdsForDrag = useCallback((assetId: string) => {
    const ids = selectedItemsRef.current
      .filter((entry) => entry.kind === "asset")
      .map((entry) => entry.id);
    return ids.includes(assetId) ? ids : [assetId];
  }, []);

  const retainExisting = useCallback(
    (
      assets: readonly AssetRecord[],
      knownFolders: readonly string[],
      scenes: readonly { id: string }[],
    ) => {
      setSelectedItems((prev) => {
        const next = prev.filter((item) =>
          itemExists(item, assets, knownFolders, scenes),
        );
        if (next.length === prev.length) {
          return prev;
        }
        selectedItemsRef.current = next;
        setAnchor((currentAnchor) => {
          if (
            currentAnchor &&
            next.some((item) => assetBrowserItemsEqual(item, currentAnchor))
          ) {
            return currentAnchor;
          }
          return next[next.length - 1];
        });
        return next;
      });
    },
    [],
  );

  return {
    selectedItems,
    selection,
    setSelection,
    replaceSelection,
    selectItem,
    isSelected,
    assetIdsForDrag,
    retainExisting,
  };
}
