import { useEffect, useRef, useState, type RefObject } from "react";
import {
  hierarchyDragNodeIds,
  isHierarchyDropBlockedByLock,
  placementFromRowOffset,
  resolveHierarchyMultiDrop,
} from "@game-editor/editor-core";
import type { Editor } from "@game-editor/editor-core";
import type { HierarchyDropIndicator } from "./hierarchy-types";

const DRAG_THRESHOLD_PX = 4;

export function useHierarchyDnD(
  editor: Editor,
  treeRef: RefObject<HTMLDivElement | null>,
): {
  draggingIds: readonly string[];
  dropIndicator: HierarchyDropIndicator;
  onDragStart: (nodeId: string, clientX: number, clientY: number) => void;
} {
  const [draggingIds, setDraggingIds] = useState<readonly string[]>([]);
  const [dropIndicator, setDropIndicator] =
    useState<HierarchyDropIndicator>(null);
  const draggingIdsRef = useRef<readonly string[]>([]);
  const dropIndicatorRef = useRef<HierarchyDropIndicator>(null);
  const pendingDragRef = useRef<
    { nodeIds: readonly string[]; x: number; y: number } | undefined
  >(undefined);

  useEffect(() => {
    draggingIdsRef.current = draggingIds;
  }, [draggingIds]);

  useEffect(() => {
    dropIndicatorRef.current = dropIndicator;
  }, [dropIndicator]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const pending = pendingDragRef.current;
      if (pending && draggingIdsRef.current.length === 0) {
        const dx = event.clientX - pending.x;
        const dy = event.clientY - pending.y;
        if (dx * dx + dy * dy >= DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
          pendingDragRef.current = undefined;
          if (pending.nodeIds.some((id) => editor.isNodeEffectivelyLocked(id))) {
            return;
          }
          setDraggingIds(pending.nodeIds);
        }
        return;
      }

      if (draggingIdsRef.current.length === 0) {
        return;
      }

      const tree = treeRef.current;
      if (!tree) {
        return;
      }
      const el = document.elementFromPoint(event.clientX, event.clientY);
      if (!(el instanceof Element) || !tree.contains(el)) {
        setDropIndicator({ placement: "root" });
        return;
      }
      if (el.closest("[data-scene-root]")) {
        setDropIndicator({ placement: "root" });
        return;
      }
      const row = el.closest("[data-node-id]");
      if (!(row instanceof HTMLElement)) {
        setDropIndicator({ placement: "root" });
        return;
      }
      const targetId = row.dataset.nodeId;
      if (!targetId || draggingIdsRef.current.includes(targetId)) {
        setDropIndicator(null);
        return;
      }
      const rect = row.getBoundingClientRect();
      const placement = placementFromRowOffset(
        event.clientY - rect.top,
        rect.height,
      );
      const blocked = isHierarchyDropBlockedByLock(
        editor.getScene(),
        editor.nodeMetadata.getSnapshot(),
        {
          draggedIds: draggingIdsRef.current,
          targetId,
          placement,
        },
      );
      setDropIndicator({ targetId, placement, blocked });
    };

    const onUp = () => {
      pendingDragRef.current = undefined;
      const dragIds = draggingIdsRef.current;
      const indicator = dropIndicatorRef.current;
      setDraggingIds([]);
      setDropIndicator(null);
      if (dragIds.length === 0 || !indicator || indicator.blocked === true) {
        return;
      }
      const resolved =
        indicator.placement === "root"
          ? resolveHierarchyMultiDrop({
              scene: editor.getScene(),
              draggedIds: dragIds,
              placement: "root",
            })
          : resolveHierarchyMultiDrop({
              scene: editor.getScene(),
              draggedIds: dragIds,
              targetId: indicator.targetId,
              placement: indicator.placement,
            });
      if (!resolved) {
        return;
      }
      editor.moveNodes(resolved);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [editor, treeRef]);

  const onDragStart = (nodeId: string, clientX: number, clientY: number) => {
    if (editor.isNodeEffectivelyLocked(nodeId)) {
      return;
    }
    pendingDragRef.current = {
      nodeIds: hierarchyDragNodeIds(
        nodeId,
        editor.selection.getSelectedNodeIds(),
      ).filter((id) => !editor.isNodeEffectivelyLocked(id)),
      x: clientX,
      y: clientY,
    };
  };

  return { draggingIds, dropIndicator, onDragStart };
}
