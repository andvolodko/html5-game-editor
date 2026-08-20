import { useEffect, useRef, useState } from "react";
import { MOUSE_BUTTON_PRIMARY } from "@game-editor/shared";
import { treeIndentPadding } from "../ui/tree-indent";

interface Props {
  sceneName: string;
  sceneSelected: boolean;
  sceneDropActive: boolean;
  displaySceneExpanded: boolean;
  searching: boolean;
  isRenamingScene: boolean;
  onSelectScene: () => void;
  onToggleExpanded: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
  onCommitRename: (name: string) => void;
  onCancelRename: () => void;
  registerRow: (el: HTMLDivElement | null) => void;
}

export function HierarchySceneRow({
  sceneName,
  sceneSelected,
  sceneDropActive,
  displaySceneExpanded,
  searching,
  isRenamingScene,
  onSelectScene,
  onToggleExpanded,
  onContextMenu,
  onCommitRename,
  onCancelRename,
  registerRow,
}: Props) {
  const [sceneDraft, setSceneDraft] = useState(sceneName);
  const sceneInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isRenamingScene) {
      setSceneDraft(sceneName);
      queueMicrotask(() => {
        sceneInputRef.current?.focus();
        sceneInputRef.current?.select();
      });
    }
  }, [isRenamingScene, sceneName]);

  return (
    <div
      ref={registerRow}
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
      onContextMenu={onContextMenu}
      onPointerDown={(event) => {
        if (event.button !== MOUSE_BUTTON_PRIMARY || isRenamingScene) {
          return;
        }
        if ((event.target as HTMLElement).closest("[data-expand]")) {
          return;
        }
        onSelectScene();
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
          onToggleExpanded();
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
          onBlur={() => onCommitRename(sceneDraft)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onCommitRename(sceneDraft);
            } else if (event.key === "Escape") {
              event.preventDefault();
              onCancelRename();
            }
          }}
        />
      ) : (
        <span className="hierarchy-label">{sceneName}</span>
      )}
    </div>
  );
}
