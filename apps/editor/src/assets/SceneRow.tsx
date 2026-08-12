import { memo } from "react";
import { InlineRename } from "./InlineRename";
import { treeIndentPadding } from "../ui/tree-indent";

export interface SceneRowProps {
  id: string;
  depth: number;
  active: boolean;
  selected: boolean;
  renaming: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onCommitRename: (name: string) => void;
  onCancelRename: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
}

function SceneRowComponent({
  id,
  depth,
  active,
  selected,
  renaming,
  onSelect,
  onOpen,
  onCommitRename,
  onCancelRename,
  onContextMenu,
}: SceneRowProps) {
  return (
    <div
      className={[
        "asset-row",
        selected ? "selected" : "",
        active ? "active-scene" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ paddingLeft: treeIndentPadding(depth) }}
      onClick={onSelect}
      onDoubleClick={() => {
        if (renaming) {
          return;
        }
        onOpen();
      }}
      onContextMenu={onContextMenu}
      title={`${id}.json — double-click to open`}
    >
      <span className="hierarchy-expand" aria-hidden>
        ·
      </span>
      <span className="asset-row-icon scene" aria-hidden />
      {renaming ? (
        <InlineRename
          initialValue={id}
          onCommit={onCommitRename}
          onCancel={onCancelRename}
        />
      ) : (
        <span className="hierarchy-label">{id}</span>
      )}
      {active ? <span className="asset-badge">open</span> : null}
    </div>
  );
}

function sceneRowPropsEqual(
  prev: SceneRowProps,
  next: SceneRowProps,
): boolean {
  return (
    prev.id === next.id &&
    prev.depth === next.depth &&
    prev.active === next.active &&
    prev.selected === next.selected &&
    prev.renaming === next.renaming
  );
}

export const SceneRow = memo(SceneRowComponent, sceneRowPropsEqual);
