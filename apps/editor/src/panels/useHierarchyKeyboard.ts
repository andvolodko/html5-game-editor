import { useEffect, type Dispatch, type SetStateAction } from "react";
import {
  HIERARCHY_SCENE_ROW_ID,
  isEditableDomTarget,
  resolveTreeKeyboardIntent,
  type Editor,
} from "@game-editor/editor-core";
import {
  findNodeById,
  type SceneData,
  type SceneNodeData,
} from "@game-editor/scene";

function firstMatchingChild(
  node: SceneNodeData,
  includeIds: ReadonlySet<string> | undefined,
): SceneNodeData | undefined {
  if (includeIds === undefined) {
    return node.children[0];
  }
  return node.children.find((child) => includeIds.has(child.id));
}

function nodeHasVisibleChildren(
  node: SceneNodeData,
  includeIds: ReadonlySet<string> | undefined,
): boolean {
  if (includeIds === undefined) {
    return node.children.length > 0;
  }
  return node.children.some((child) => includeIds.has(child.id));
}

function setExpandedId(
  setExpanded: Dispatch<SetStateAction<Set<string>>>,
  id: string,
  expanded: boolean,
): void {
  setExpanded((previous) => {
    if (previous.has(id) === expanded) {
      return previous;
    }
    const next = new Set(previous);
    if (expanded) {
      next.add(id);
    } else {
      next.delete(id);
    }
    return next;
  });
}

export function useHierarchyKeyboard(options: {
  editor: Editor;
  scene: SceneData;
  panelFocused: boolean;
  renaming: boolean;
  sceneSelected: boolean;
  selectedNodeIds: readonly string[];
  visibleNodeIds: readonly string[];
  rootNodes: readonly SceneNodeData[];
  searchVisibleIds: ReadonlySet<string> | undefined;
  displayExpanded: ReadonlySet<string>;
  displaySceneExpanded: boolean;
  setExpanded: Dispatch<SetStateAction<Set<string>>>;
  setSceneExpanded: Dispatch<SetStateAction<boolean>>;
}): void {
  const {
    editor,
    scene,
    panelFocused,
    renaming,
    sceneSelected,
    selectedNodeIds,
    visibleNodeIds,
    rootNodes,
    searchVisibleIds,
    displayExpanded,
    displaySceneExpanded,
    setExpanded,
    setSceneExpanded,
  } = options;

  useEffect(() => {
    if (!panelFocused || renaming) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableDomTarget(event.target)) {
        return;
      }

      const visibleIds = [HIERARCHY_SCENE_ROW_ID, ...visibleNodeIds];
      const primaryId = selectedNodeIds[selectedNodeIds.length - 1];
      const currentId = sceneSelected
        ? HIERARCHY_SCENE_ROW_ID
        : primaryId;
      const isSceneRow =
        currentId === undefined || currentId === HIERARCHY_SCENE_ROW_ID;
      const node = isSceneRow
        ? undefined
        : findNodeById(scene, currentId);
      const firstChild = isSceneRow
        ? rootNodes[0]
        : node
          ? firstMatchingChild(node, searchVisibleIds)
          : undefined;
      const parentId = isSceneRow
        ? undefined
        : node?.parentId !== undefined && visibleIds.includes(node.parentId)
          ? node.parentId
          : HIERARCHY_SCENE_ROW_ID;
      const intent = resolveTreeKeyboardIntent({
        key: event.key,
        code: event.code,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        visibleIds,
        currentId,
        expanded: isSceneRow
          ? displaySceneExpanded
          : currentId !== undefined && displayExpanded.has(currentId),
        hasChildren: isSceneRow
          ? rootNodes.length > 0
          : node !== undefined && nodeHasVisibleChildren(node, searchVisibleIds),
        parentId,
        firstChildId: firstChild?.id,
        expandEnabled: searchVisibleIds === undefined,
      });
      if (!intent) {
        return;
      }
      event.preventDefault();

      if (intent.type === "select") {
        if (intent.id === HIERARCHY_SCENE_ROW_ID) {
          editor.selectScene();
          return;
        }
        editor.selectFromVisibleList(visibleNodeIds, intent.id, {
          shiftKey: event.shiftKey,
          toggleKey: false,
        });
        return;
      }
      if (intent.type === "select-all") {
        if (visibleNodeIds.length > 0) {
          editor.selectNodes(visibleNodeIds);
        } else {
          editor.selectScene();
        }
        return;
      }

      const targetId = currentId ?? HIERARCHY_SCENE_ROW_ID;
      if (intent.type === "expand") {
        if (targetId === HIERARCHY_SCENE_ROW_ID) {
          setSceneExpanded(true);
        } else {
          setExpandedId(setExpanded, targetId, true);
        }
        return;
      }
      if (intent.type === "collapse") {
        if (targetId === HIERARCHY_SCENE_ROW_ID) {
          setSceneExpanded(false);
        } else {
          setExpandedId(setExpanded, targetId, false);
        }
        return;
      }
      if (intent.type === "toggle-expand") {
        if (targetId === HIERARCHY_SCENE_ROW_ID) {
          setSceneExpanded((previous) => !previous);
        } else {
          setExpanded((previous) => {
            const next = new Set(previous);
            if (next.has(targetId)) {
              next.delete(targetId);
            } else {
              next.add(targetId);
            }
            return next;
          });
        }
        return;
      }
      if (intent.type === "activate") {
        if (firstChild) {
          editor.selectNodes([firstChild.id]);
          return;
        }
        if (targetId === HIERARCHY_SCENE_ROW_ID) {
          setSceneExpanded(true);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    displayExpanded,
    displaySceneExpanded,
    editor,
    panelFocused,
    renaming,
    rootNodes,
    scene,
    sceneSelected,
    searchVisibleIds,
    selectedNodeIds,
    setExpanded,
    setSceneExpanded,
    visibleNodeIds,
  ]);
}
