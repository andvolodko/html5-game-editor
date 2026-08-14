import { useEffect, useState, type MouseEvent, type RefObject } from "react";
import type { Editor } from "@game-editor/editor-core";
import { EditorContextMenu } from "../ui/EditorContextMenu";
import type { SceneViewportHandle } from "../viewport/create-scene-viewport";

export interface SceneContextMenuState {
  x: number;
  y: number;
  nodeId: string;
}

export type SceneContextMenuAction = "duplicate" | "reset-transform";

export function useSceneNodeContextMenu(
  editor: Editor,
  viewportRef: RefObject<SceneViewportHandle | null>,
  selectedIds: readonly string[],
): {
  menu: SceneContextMenuState | null;
  onViewportContextMenu: (event: MouseEvent) => void;
  onAction: (action: SceneContextMenuAction) => void;
} {
  const [menu, setMenu] = useState<SceneContextMenuState | null>(null);

  useEffect(() => {
    if (!menu) {
      return;
    }
    const close = () => setMenu(null);
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
  }, [menu]);

  const onViewportContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    const nodeId = viewportRef.current?.pickNodeId(
      event.clientX,
      event.clientY,
    );
    if (!nodeId) {
      setMenu(null);
      return;
    }
    if (!selectedIds.includes(nodeId)) {
      editor.selectNodes([nodeId]);
    }
    setMenu({ x: event.clientX, y: event.clientY, nodeId });
  };

  const onAction = (action: SceneContextMenuAction) => {
    const current = menu;
    setMenu(null);
    if (!current) {
      return;
    }
    if (action === "duplicate") {
      editor.duplicateNode(current.nodeId);
      return;
    }
    editor.resetNodeTransform(current.nodeId);
  };

  return { menu, onViewportContextMenu, onAction };
}

export function SceneContextMenu({
  menu,
  onAction,
}: {
  menu: SceneContextMenuState;
  onAction: (action: SceneContextMenuAction) => void;
}) {
  return (
    <EditorContextMenu x={menu.x} y={menu.y}>
      <li>
        <button type="button" onClick={() => onAction("duplicate")}>
          Duplicate
        </button>
      </li>
      <li>
        <button type="button" onClick={() => onAction("reset-transform")}>
          Reset Transform
        </button>
      </li>
    </EditorContextMenu>
  );
}
