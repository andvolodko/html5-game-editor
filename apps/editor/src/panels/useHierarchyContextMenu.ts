import { useEffect, useState } from "react";
import { findNodeById } from "@game-editor/scene";
import type { Editor } from "@game-editor/editor-core";
import type { HierarchyContextMenuState, HierarchyRenamingTarget } from "./hierarchy-types";

interface HierarchyContextMenuOptions {
  editor: Editor;
  setSceneExpanded: (value: boolean | ((prev: boolean) => boolean)) => void;
  setExpanded: (value: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setRenamingTarget: (target: HierarchyRenamingTarget) => void;
  setSelectedAssetId: (assetId: string | undefined) => void;
}

export function useHierarchyContextMenu({
  editor,
  setSceneExpanded,
  setExpanded,
  setRenamingTarget,
  setSelectedAssetId,
}: HierarchyContextMenuOptions): {
  contextMenu: HierarchyContextMenuState | null;
  setContextMenu: (menu: HierarchyContextMenuState | null) => void;
  closeMenu: () => void;
  runMenu: (action: string) => void;
} {
  const [contextMenu, setContextMenu] = useState<HierarchyContextMenuState | null>(
    null,
  );

  const closeMenu = () => setContextMenu(null);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }
    const close = () => setContextMenu(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [contextMenu]);

  const runMenu = (action: string) => {
    const menu = contextMenu;
    closeMenu();
    if (!menu) {
      return;
    }
    if (action === "create-root") {
      editor.createContainer();
      setSceneExpanded(true);
      return;
    }
    if (action === "show-all") {
      editor.showAllNodes();
      return;
    }
    if (action === "hide-all") {
      editor.hideAllNodes();
      return;
    }
    if (action === "lock-all") {
      editor.lockAllNodes();
      return;
    }
    if (action === "unlock-all") {
      editor.unlockAllNodes();
      return;
    }
    if (action === "rename-scene") {
      setRenamingTarget("scene");
      return;
    }
    if (menu.target === "scene" || menu.target === "background") {
      return;
    }
    const nodeId = menu.target.nodeId;
    if (action === "create-child") {
      if (editor.isNodeEffectivelyLocked(nodeId)) {
        return;
      }
      setExpanded((prev) => new Set(prev).add(nodeId));
      setSceneExpanded(true);
      editor.selectNodes([nodeId]);
      editor.createNode({ typeId: "pixi.container" });
      return;
    }
    if (action === "rename") {
      if (editor.isNodeEffectivelyLocked(nodeId)) {
        return;
      }
      setRenamingTarget(nodeId);
      return;
    }
    if (action === "duplicate") {
      editor.duplicateNode(nodeId);
      return;
    }
    if (action === "delete") {
      editor.deleteNode(nodeId);
      return;
    }
    if (action === "hide") {
      editor.setNodeHidden(nodeId, true);
      return;
    }
    if (action === "show") {
      editor.setNodeHidden(nodeId, false);
      return;
    }
    if (action === "lock") {
      editor.setNodeLocked(nodeId, true);
      return;
    }
    if (action === "unlock") {
      editor.setNodeLocked(nodeId, false);
      return;
    }
    if (action === "hide-children") {
      editor.setNodeHiddenRecursive(nodeId, true);
      return;
    }
    if (action === "show-children") {
      editor.setNodeHiddenRecursive(nodeId, false);
      return;
    }
    if (action === "lock-children") {
      editor.setNodeLockedRecursive(nodeId, true);
      return;
    }
    if (action === "unlock-children") {
      editor.setNodeLockedRecursive(nodeId, false);
      return;
    }
    if (action === "create-prefab") {
      void editor.createPrefabFromNode(nodeId).catch((error: unknown) => {
        editor.console.log({
          level: "error",
          category: "prefab",
          message: error instanceof Error ? error.message : "Create Prefab failed",
        });
      });
      return;
    }
    if (action === "open-prefab") {
      const node = findNodeById(editor.getScene(), nodeId);
      const assetId = node?.prefab?.prefabAssetId;
      if (assetId) {
        void editor.openPrefab(assetId).catch(() => undefined);
      }
      return;
    }
    if (action === "select-prefab-asset") {
      const node = findNodeById(editor.getScene(), nodeId);
      const assetId = node?.prefab?.prefabAssetId;
      if (assetId) {
        setSelectedAssetId(assetId);
      }
      return;
    }
    if (action === "apply-all") {
      void editor.applyPrefabOverrides(nodeId);
      return;
    }
    if (action === "revert-all") {
      editor.revertPrefabOverrides(nodeId);
      return;
    }
    if (action === "unpack") {
      editor.unpackPrefab(nodeId);
    }
  };

  return { contextMenu, setContextMenu, closeMenu, runMenu };
}
