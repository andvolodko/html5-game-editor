import { useEffect, useMemo, useRef, useState } from "react";
import {
  assetIdsFromDragPayload,
  decodeAssetDragPayload,
  EDITOR_ASSET_MIME,
  flattenVisibleNodeIds,
  getEditorNodeFlags,
  hierarchyQueryMatchesName,
  hierarchySearchExpandIds,
  hierarchySearchVisibleIds,
  isHierarchySearching,
  isToggleSelectionKey,
  sceneHasHiddenNodes,
  sceneHasLockedNodes,
} from "@game-editor/editor-core";
import {
  findNodeById,
  flattenNodes,
  getAncestorIds,
  nodeCanHaveChildren,
  type SceneData,
} from "@game-editor/scene";
import { MOUSE_BUTTON_PRIMARY } from "@game-editor/shared";
import { useAssetPreviewSelection } from "../assets/asset-preview-selection";
import { useEditor } from "../editor-context";
import { useEditorState } from "../hooks/useEditorState";
import { treeIndentPadding } from "../ui/tree-indent";
import { HierarchyContextMenu } from "./HierarchyContextMenu";
import { HierarchyNodeRow } from "./HierarchyNodeRow";
import { HierarchyToolbar } from "./HierarchyToolbar";
import type { HierarchyContextMenuState } from "./hierarchy-types";
import { useHierarchyDnD } from "./useHierarchyDnD";
import { useHierarchyKeyboard } from "./useHierarchyKeyboard";
import { useHierarchyRename } from "./useHierarchyRename";

export function HierarchyPanel() {
  const editor = useEditor();
  const scene = useEditorState((ed) => ed.getScene());
  const documentMode = useEditorState((ed) => ed.prefabs.getMode());
  const selected = useEditorState((ed) => ed.selection.getSelectedNodeIds());
  const metadata = useEditorState((ed) => ed.nodeMetadata.getSnapshot());
  const sceneSelected = useEditorState((ed) => ed.selection.isSceneSelected());
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [sceneExpanded, setSceneExpanded] = useState(true);
  const [query, setQuery] = useState("");
  const [contextMenu, setContextMenu] = useState<HierarchyContextMenuState | null>(
    null,
  );
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const sceneRowRef = useRef<HTMLDivElement | null>(null);
  const treeRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelFocused, setPanelFocused] = useState(false);

  const { setSelectedAssetId } = useAssetPreviewSelection();
  const { draggingIds, dropIndicator, onDragStart } = useHierarchyDnD(
    editor,
    treeRef,
  );
  const searching = isHierarchySearching(query);
  const sceneNameMatches = hierarchyQueryMatchesName(scene.name, query);
  const searchVisibleIds = useMemo(() => {
    if (!searching || sceneNameMatches) {
      return undefined;
    }
    return hierarchySearchVisibleIds(scene.nodes, query);
  }, [query, scene, sceneNameMatches, searching]);
  const displayExpanded = useMemo(() => {
    if (searchVisibleIds === undefined) {
      return expanded;
    }
    return hierarchySearchExpandIds(scene.nodes, searchVisibleIds);
  }, [expanded, scene, searchVisibleIds]);
  const displaySceneExpanded = searching ? true : sceneExpanded;
  const visibleNodeIds = useMemo(
    () =>
      displaySceneExpanded
        ? flattenVisibleNodeIds(scene.nodes, displayExpanded, searchVisibleIds)
        : [],
    [displayExpanded, displaySceneExpanded, scene, searchVisibleIds],
  );
  const rootNodes = useMemo(
    () =>
      searchVisibleIds === undefined
        ? scene.nodes
        : scene.nodes.filter((node) => searchVisibleIds.has(node.id)),
    [scene, searchVisibleIds],
  );
  const { renamingTarget, setRenamingTarget } = useHierarchyRename(
    editor,
    scene,
    setSceneExpanded,
    setExpanded,
  );

  useHierarchyKeyboard({
    editor,
    scene,
    panelFocused,
    renaming: renamingTarget !== undefined,
    sceneSelected,
    selectedNodeIds: selected,
    visibleNodeIds,
    rootNodes,
    searchVisibleIds,
    displayExpanded,
    displaySceneExpanded,
    setExpanded,
    setSceneExpanded,
  });

  const primaryId = selected[selected.length - 1];

  useEffect(() => {
    if (documentMode.kind !== "prefab") {
      return;
    }
    setSceneExpanded(true);
    setExpanded(
      new Set(
        flattenNodes(scene)
          .filter((node) => node.children.length > 0)
          .map((node) => node.id),
      ),
    );
  }, [documentMode, scene]);

  useEffect(() => {
    if (!primaryId) {
      return;
    }
    const ancestors = getAncestorIds(scene, primaryId);
    setSceneExpanded(true);
    if (ancestors.length === 0) {
      return;
    }
    setExpanded((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of ancestors) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [scene, primaryId]);

  useEffect(() => {
    if (sceneSelected) {
      sceneRowRef.current?.scrollIntoView({ block: "nearest" });
      return;
    }
    if (!primaryId) {
      return;
    }
    rowRefs.current.get(primaryId)?.scrollIntoView({ block: "nearest" });
  }, [primaryId, sceneSelected, displayExpanded, displaySceneExpanded]);

  const toggleExpanded = (nodeId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const selectClick = (nodeId: string, event: React.MouseEvent) => {
    const toggleKey = isToggleSelectionKey(event);
    if (
      !toggleKey &&
      !event.shiftKey &&
      selected.includes(nodeId) &&
      selected.length > 1
    ) {
      return;
    }
    editor.selectFromVisibleList(visibleNodeIds, nodeId, {
      shiftKey: event.shiftKey,
      toggleKey,
    });
  };

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

  const sceneDropActive = dropIndicator?.placement === "root";
  const [sceneDraft, setSceneDraft] = useState(scene.name);
  const sceneInputRef = useRef<HTMLInputElement | null>(null);
  const isRenamingScene = renamingTarget === "scene";

  useEffect(() => {
    if (isRenamingScene) {
      setSceneDraft(scene.name);
      queueMicrotask(() => {
        sceneInputRef.current?.focus();
        sceneInputRef.current?.select();
      });
    }
  }, [isRenamingScene, scene.name]);

  const commitSceneRename = (name: string) => {
    setRenamingTarget(undefined);
    if (name.trim().length > 0) {
      editor.renameScene(name);
    }
  };

  const anyHidden = sceneHasHiddenNodes(scene, metadata);
  const anyLocked = sceneHasLockedNodes(scene, metadata);

  return (
    <div
      ref={panelRef}
      tabIndex={0}
      data-editor-panel="hierarchy"
      className="panel hierarchy-panel"
      onClick={closeMenu}
      onFocus={() => setPanelFocused(true)}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) {
          return;
        }
        setPanelFocused(false);
      }}
      onPointerDownCapture={() => {
        panelRef.current?.focus({ preventScroll: true });
      }}
    >
      <HierarchyToolbar
        query={query}
        anyHidden={anyHidden}
        anyLocked={anyLocked}
        onQueryChange={setQuery}
        onToggleHidden={() => editor.toggleAllNodesHidden()}
        onToggleLocked={() => editor.toggleAllNodesLocked()}
      />
      <div
        ref={treeRef}
        className={
          sceneDropActive ? "hierarchy-tree drop-root" : "hierarchy-tree"
        }
        onDragOver={(event) => {
          if (![...event.dataTransfer.types].includes(EDITOR_ASSET_MIME)) {
            return;
          }
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(event) => {
          if (![...event.dataTransfer.types].includes(EDITOR_ASSET_MIME)) {
            return;
          }
          event.preventDefault();
          const payload = decodeAssetDragPayload(
            event.dataTransfer.getData(EDITOR_ASSET_MIME),
          );
          if (!payload) {
            return;
          }
          const row = (event.target as HTMLElement | null)?.closest("[data-node-id]");
          const targetId =
            row instanceof HTMLElement ? row.dataset.nodeId : undefined;
          const parentId = resolvePrefabDropParent(editor.getScene(), targetId);
          if (parentId !== undefined && editor.isNodeEffectivelyLocked(parentId)) {
            return;
          }
          for (const assetId of assetIdsFromDragPayload(payload)) {
            const asset = editor.assets.get(assetId);
            if (asset?.type !== "prefab") {
              continue;
            }
            void editor
              .instantiatePrefabFromAsset(assetId, undefined, parentId)
              .catch((error: unknown) => {
                editor.console.log({
                  level: "error",
                  category: "prefab",
                  message:
                    error instanceof Error
                      ? error.message
                      : "Instantiate prefab failed",
                });
              });
          }
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          setContextMenu({
            x: event.clientX,
            y: event.clientY,
            target: "background",
          });
        }}
      >
        <div className="hierarchy-branch">
          <div
            ref={sceneRowRef}
            data-scene-root
            className={[
              "hierarchy-row",
              "scene-root",
              sceneSelected ? "selected" : "",
              sceneDropActive ? "drop-inside" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ paddingLeft: treeIndentPadding(0) }}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              editor.selectScene();
              setContextMenu({
                x: event.clientX,
                y: event.clientY,
                target: "scene",
              });
            }}
            onPointerDown={(event) => {
              if (event.button !== MOUSE_BUTTON_PRIMARY || isRenamingScene) {
                return;
              }
              if ((event.target as HTMLElement).closest("[data-expand]")) {
                return;
              }
              editor.selectScene();
            }}
          >
            <button
              type="button"
              data-expand
              className="hierarchy-expand"
              tabIndex={-1}
              aria-label={displaySceneExpanded ? "Collapse" : "Expand"}
              disabled={searching}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.stopPropagation();
                setSceneExpanded((prev) => !prev);
              }}
            >
              {displaySceneExpanded ? "▼" : "▶"}
            </button>
            <span className="hierarchy-icon" aria-hidden>
              ◈
            </span>
            {isRenamingScene ? (
              <input
                ref={sceneInputRef}
                className="hierarchy-rename-input"
                value={sceneDraft}
                onChange={(event) => setSceneDraft(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                onBlur={() => commitSceneRename(sceneDraft)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitSceneRename(sceneDraft);
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    setRenamingTarget(undefined);
                  }
                }}
              />
            ) : (
              <span className="hierarchy-label">{scene.name}</span>
            )}
          </div>
          {displaySceneExpanded ? (
            <>
              {rootNodes.map((node) => (
                <HierarchyNodeRow
                  key={node.id}
                  node={node}
                  depth={1}
                  expanded={displayExpanded}
                  includeIds={searchVisibleIds}
                  selectedIds={selected}
                  draggingIds={draggingIds}
                  dropIndicator={dropIndicator}
                  renamingId={
                    renamingTarget !== undefined && renamingTarget !== "scene"
                      ? renamingTarget
                      : undefined
                  }
                  flagsFor={(nodeId) =>
                    getEditorNodeFlags(scene, metadata, nodeId)
                  }
                  onToggle={toggleExpanded}
                  onSelect={selectClick}
                  onContextMenu={(nodeId, event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!selected.includes(nodeId)) {
                      editor.selectNodes([nodeId]);
                    }
                    setContextMenu({
                      x: event.clientX,
                      y: event.clientY,
                      target: { nodeId },
                    });
                  }}
                  onDragStart={(id, clientX, clientY) => {
                    if (renamingTarget) {
                      return;
                    }
                    onDragStart(id, clientX, clientY);
                  }}
                  onToggleHidden={(id, recursive) => {
                    editor.setNodeHidden(
                      id,
                      !editor.isNodeHiddenInEditor(id),
                      { recursive },
                    );
                  }}
                  onToggleLocked={(id, recursive) => {
                    editor.setNodeLocked(id, !editor.isNodeLocked(id), {
                      recursive,
                    });
                  }}
                  onCommitRename={(id, name) => {
                    setRenamingTarget(undefined);
                    if (name.trim().length > 0) {
                      editor.renameNode(id, name);
                    }
                  }}
                  onCancelRename={() => setRenamingTarget(undefined)}
                  registerRow={(id, el) => {
                    if (el) {
                      rowRefs.current.set(id, el);
                    } else {
                      rowRefs.current.delete(id);
                    }
                  }}
                />
              ))}
              {searching && rootNodes.length === 0 ? (
                <p className="panel-empty hierarchy-tree-empty">No matching nodes</p>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {contextMenu ? (
        <HierarchyContextMenu menu={contextMenu} onAction={runMenu} />
      ) : null}
    </div>
  );
}

function resolvePrefabDropParent(
  scene: SceneData,
  targetId: string | undefined,
): string | undefined {
  if (targetId === undefined) {
    return undefined;
  }
  const node = findNodeById(scene, targetId);
  if (!node) {
    return undefined;
  }
  if (nodeCanHaveChildren(node)) {
    return node.id;
  }
  return node.parentId;
}
