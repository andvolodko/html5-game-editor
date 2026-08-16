import { useEffect, useMemo, useRef, useState } from "react";
import { getNodeTypeIcon, type SceneNodeData } from "@game-editor/scene";
import { MOUSE_BUTTON_PRIMARY } from "@game-editor/shared";
import { treeIndentPadding } from "../ui/tree-indent";
import type { HierarchyDropIndicator } from "./hierarchy-types";

export interface HierarchyNodeRowProps {
  node: SceneNodeData;
  depth: number;
  expanded: ReadonlySet<string>;
  selectedIds: readonly string[];
  draggingIds: readonly string[];
  dropIndicator: HierarchyDropIndicator;
  renamingId: string | undefined;
  onToggle: (nodeId: string) => void;
  onSelect: (nodeId: string, event: React.MouseEvent) => void;
  onContextMenu: (nodeId: string, event: React.MouseEvent) => void;
  onDragStart: (nodeId: string, clientX: number, clientY: number) => void;
  onCommitRename: (nodeId: string, name: string) => void;
  onCancelRename: () => void;
  registerRow: (nodeId: string, el: HTMLDivElement | null) => void;
}

export function HierarchyNodeRow(props: HierarchyNodeRowProps) {
  const {
    node,
    depth,
    expanded,
    selectedIds,
    draggingIds,
    dropIndicator,
    renamingId,
    onToggle,
    onSelect,
    onContextMenu,
    onDragStart,
    onCommitRename,
    onCancelRename,
    registerRow,
  } = props;
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isSelected = selectedIds.includes(node.id);
  const isRenaming = renamingId === node.id;
  const [draft, setDraft] = useState(node.name);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isRenaming) {
      setDraft(node.name);
      queueMicrotask(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isRenaming, node.name]);

  const icon = useMemo(() => getNodeTypeIcon(node), [node]);

  const indicatorClass =
    dropIndicator &&
    dropIndicator.placement !== "root" &&
    dropIndicator.targetId === node.id
      ? `drop-${dropIndicator.placement}`
      : "";

  return (
    <div className="hierarchy-branch">
      <div
        ref={(el) => registerRow(node.id, el)}
        data-node-id={node.id}
        className={[
          "hierarchy-row",
          isSelected ? "selected" : "",
          draggingIds.includes(node.id) ? "dragging" : "",
          indicatorClass,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ paddingLeft: treeIndentPadding(depth) }}
        onClick={(event) => {
          // Selection handled on pointerdown for snappier UX.
          void event;
        }}
        onContextMenu={(event) => onContextMenu(node.id, event)}
        onPointerDown={(event) => {
          if (event.button !== MOUSE_BUTTON_PRIMARY || isRenaming) {
            return;
          }
          if ((event.target as HTMLElement).closest("[data-expand]")) {
            return;
          }
          onSelect(node.id, event);
          if (event.ctrlKey || event.metaKey || event.shiftKey) {
            return;
          }
          onDragStart(node.id, event.clientX, event.clientY);
        }}
      >
        <button
          type="button"
          data-expand
          className="hierarchy-expand"
          disabled={!hasChildren}
          aria-label={isExpanded ? "Collapse" : "Expand"}
          onClick={(event) => {
            event.stopPropagation();
            if (hasChildren) {
              onToggle(node.id);
            }
          }}
        >
          {hasChildren ? (isExpanded ? "▼" : "▶") : "·"}
        </button>
        <span className="hierarchy-icon" aria-hidden>
          {icon}
        </span>
        {isRenaming ? (
          <input
            ref={inputRef}
            className="hierarchy-rename-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onBlur={() => onCommitRename(node.id, draft)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onCommitRename(node.id, draft);
              } else if (event.key === "Escape") {
                event.preventDefault();
                onCancelRename();
              }
            }}
          />
        ) : (
          <span className="hierarchy-label">
            {node.name}
            {node.prefab?.isRoot === true ? (
              <span className="hierarchy-prefab-badge" title="Prefab instance">
                prefab
              </span>
            ) : node.prefab ? (
              <span className="hierarchy-prefab-link" title="Inherited prefab node">
                ↻
              </span>
            ) : null}
          </span>
        )}
      </div>
      {hasChildren && isExpanded
        ? node.children.map((child) => (
            <HierarchyNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selectedIds={selectedIds}
              draggingIds={draggingIds}
              dropIndicator={dropIndicator}
              renamingId={renamingId}
              onToggle={onToggle}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              onDragStart={onDragStart}
              onCommitRename={onCommitRename}
              onCancelRename={onCancelRename}
              registerRow={registerRow}
            />
          ))
        : null}
    </div>
  );
}
