import { useEffect, useRef, useState, type RefObject } from "react";
import {
  placementFromRowOffset,
  resolveHierarchyDrop,
} from "@game-editor/editor-core";
import type { Editor } from "@game-editor/editor-core";
import type { HierarchyDropIndicator } from "./hierarchy-types";

const DRAG_THRESHOLD_PX = 4;

export function useHierarchyDnD(
  editor: Editor,
  treeRef: RefObject<HTMLDivElement | null>,
): {
  draggingId: string | undefined;
  dropIndicator: HierarchyDropIndicator;
  onDragStart: (nodeId: string, clientX: number, clientY: number) => void;
} {
  const [draggingId, setDraggingId] = useState<string | undefined>();
  const [dropIndicator, setDropIndicator] =
    useState<HierarchyDropIndicator>(null);
  const draggingIdRef = useRef<string | undefined>(undefined);
  const dropIndicatorRef = useRef<HierarchyDropIndicator>(null);
  const pendingDragRef = useRef<
    { nodeId: string; x: number; y: number } | undefined
  >(undefined);

  useEffect(() => {
    draggingIdRef.current = draggingId;
  }, [draggingId]);

  useEffect(() => {
    dropIndicatorRef.current = dropIndicator;
  }, [dropIndicator]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const pending = pendingDragRef.current;
      if (pending && !draggingIdRef.current) {
        const dx = event.clientX - pending.x;
        const dy = event.clientY - pending.y;
        if (dx * dx + dy * dy >= DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
          pendingDragRef.current = undefined;
          setDraggingId(pending.nodeId);
        }
        return;
      }

      if (!draggingIdRef.current) {
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
      const dragId = draggingIdRef.current;
      if (!targetId || targetId === dragId) {
        setDropIndicator(null);
        return;
      }
      const rect = row.getBoundingClientRect();
      const placement = placementFromRowOffset(
        event.clientY - rect.top,
        rect.height,
      );
      setDropIndicator({ targetId, placement });
    };

    const onUp = () => {
      pendingDragRef.current = undefined;
      const dragId = draggingIdRef.current;
      const indicator = dropIndicatorRef.current;
      setDraggingId(undefined);
      setDropIndicator(null);
      if (!dragId || !indicator) {
        return;
      }
      const resolved =
        indicator.placement === "root"
          ? resolveHierarchyDrop({
              scene: editor.getScene(),
              draggedId: dragId,
              placement: "root",
            })
          : resolveHierarchyDrop({
              scene: editor.getScene(),
              draggedId: dragId,
              targetId: indicator.targetId,
              placement: indicator.placement,
            });
      if (!resolved) {
        return;
      }
      try {
        editor.moveNode(dragId, resolved.toParentId, resolved.toIndex);
      } catch {
        // Domain rejected; ignore.
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [editor, treeRef]);

  const onDragStart = (nodeId: string, clientX: number, clientY: number) => {
    pendingDragRef.current = { nodeId, x: clientX, y: clientY };
  };

  return { draggingId, dropIndicator, onDragStart };
}
