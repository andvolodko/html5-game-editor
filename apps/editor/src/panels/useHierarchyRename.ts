import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { getAncestorIds, type SceneData } from "@game-editor/scene";
import type { Editor } from "@game-editor/editor-core";
import type { HierarchyRenamingTarget } from "./hierarchy-types";

export function useHierarchyRename(
  editor: Editor,
  scene: SceneData,
  setSceneExpanded: Dispatch<SetStateAction<boolean>>,
  setExpanded: Dispatch<SetStateAction<Set<string>>>,
): {
  renamingTarget: HierarchyRenamingTarget;
  setRenamingTarget: Dispatch<SetStateAction<HierarchyRenamingTarget>>;
} {
  const [renamingTarget, setRenamingTarget] =
    useState<HierarchyRenamingTarget>();

  useEffect(() => {
    return editor.onRenameRequest((target) => {
      if (target.kind === "scene") {
        setRenamingTarget("scene");
        setSceneExpanded(true);
        return;
      }
      setRenamingTarget(target.nodeId);
      setSceneExpanded(true);
      setExpanded((prev) => {
        const next = new Set(prev);
        for (const id of getAncestorIds(scene, target.nodeId)) {
          next.add(id);
        }
        return next;
      });
    });
  }, [editor, scene, setSceneExpanded, setExpanded]);

  return { renamingTarget, setRenamingTarget };
}
