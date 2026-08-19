import { useEffect, useMemo, useRef, useState } from "react";
import {
  isHierarchyChromeEventTarget,
  type EditorNodeFlags,
} from "@game-editor/editor-core";
import { getNodeTypeIcon, type SceneNodeData } from "@game-editor/scene";
import { MOUSE_BUTTON_PRIMARY } from "@game-editor/shared";
import { EyeIcon, LockIcon } from "../ui/hierarchy-icons";
import { treeIndentPadding } from "../ui/tree-indent";
import type { HierarchyDropIndicator } from "./hierarchy-types";

export interface HierarchyNodeRowProps {
  node: SceneNodeData;
  depth: number;
  expanded: ReadonlySet<string>;
  includeIds?: ReadonlySet<string>;
  selectedIds: readonly string[];
  draggingIds: readonly string[];
  dropIndicator: HierarchyDropIndicator;
  renamingId: string | undefined;
  flagsFor: (nodeId: string) => EditorNodeFlags;
  onToggle: (nodeId: string) => void;
  onSelect: (nodeId: string, event: React.MouseEvent) => void;
  onContextMenu: (nodeId: string, event: React.MouseEvent) => void;
  onDragStart: (nodeId: string, clientX: number, clientY: number) => void;
  onToggleHidden: (nodeId: string, recursive: boolean) => void;
  onToggleLocked: (nodeId: string, recursive: boolean) => void;
  onCommitRename: (nodeId: string, name: string) => void;
  onCancelRename: () => void;
  registerRow: (nodeId: string, el: HTMLDivElement | null) => void;
}

export function HierarchyNodeRow(props: HierarchyNodeRowProps) {
  const {
    node,
    depth,
    expanded,
    includeIds,
    selectedIds,
    draggingIds,
    dropIndicator,
    renamingId,
    flagsFor,
    onToggle,
    onSelect,
    onContextMenu,
    onDragStart,
    onToggleHidden,
    onToggleLocked,
    onCommitRename,
    onCancelRename,
    registerRow,
  } = props;
  const childNodes =
    includeIds === undefined
      ? node.children
      : node.children.filter((child) => includeIds.has(child.id));
  const hasChildren = childNodes.length > 0;
  const isExpanded = expanded.has(node.id);
  const isSelected = selectedIds.includes(node.id);
  const isRenaming = renamingId === node.id;
  const [draft, setDraft] = useState(node.name);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const flags = flagsFor(node.id);

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
      ? dropIndicator.blocked === true
        ? "drop-invalid"
        : `drop-${dropIndicator.placement}`
      : "";

  const visibilityTitle = flags.ownHidden
    ? "Show in editor (Shift: include children)"
    : flags.hiddenByAncestorName
      ? `Hidden because parent "${flags.hiddenByAncestorName}" is hidden`
      : "Hide in editor (Shift: include children)";
  const lockTitle = flags.ownLocked
    ? "Unlock node (Shift: include children)"
    : flags.lockedByAncestorName
      ? `Locked because parent "${flags.lockedByAncestorName}" is locked`
      : "Lock node (Shift: include children)";

  return (
    <div className="hierarchy-branch">
      <div
        ref={(el) => registerRow(node.id, el)}
        data-node-id={node.id}
        className={[
          "hierarchy-row",
          isSelected ? "selected" : "",
          draggingIds.includes(node.id) ? "dragging" : "",
          flags.ownHidden || flags.effectivelyHidden ? "editor-hidden" : "",
          flags.ownLocked || flags.effectivelyLocked ? "editor-locked" : "",
          indicatorClass,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ paddingLeft: treeIndentPadding(depth) }}
        onClick={(event) => {
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
          if (isHierarchyChromeEventTarget(event.target)) {
            return;
          }
          onSelect(node.id, event);
          if (event.ctrlKey || event.metaKey || event.shiftKey) {
            return;
          }
          if (flags.effectivelyLocked) {
            return;
          }
          onDragStart(node.id, event.clientX, event.clientY);
        }}
      >
        <button
          type="button"
          data-expand
          className="hierarchy-expand"
          tabIndex={-1}
          disabled={!hasChildren}
          aria-label={isExpanded ? "Collapse" : "Expand"}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
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
        <span className="hierarchy-row-actions">
          <button
            type="button"
            data-hierarchy-chrome=""
            className={[
              "hierarchy-chrome-btn",
              flags.ownHidden ? "active" : "",
              !flags.ownHidden && flags.effectivelyHidden ? "inherited" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            title={visibilityTitle}
            aria-label={flags.ownHidden ? "Show in editor" : "Hide in editor"}
            aria-pressed={flags.ownHidden}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onToggleHidden(node.id, event.shiftKey);
            }}
          >
            <EyeIcon off={flags.ownHidden || flags.effectivelyHidden} />
          </button>
          <button
            type="button"
            data-hierarchy-chrome=""
            className={[
              "hierarchy-chrome-btn",
              flags.ownLocked ? "active" : "",
              !flags.ownLocked && flags.effectivelyLocked ? "inherited" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            title={lockTitle}
            aria-label={flags.ownLocked ? "Unlock node" : "Lock node"}
            aria-pressed={flags.ownLocked}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onToggleLocked(node.id, event.shiftKey);
            }}
          >
            <LockIcon locked={flags.ownLocked || flags.effectivelyLocked} />
          </button>
        </span>
      </div>
      {hasChildren && isExpanded
        ? childNodes.map((child) => (
            <HierarchyNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              includeIds={includeIds}
              selectedIds={selectedIds}
              draggingIds={draggingIds}
              dropIndicator={dropIndicator}
              renamingId={renamingId}
              flagsFor={flagsFor}
              onToggle={onToggle}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              onDragStart={onDragStart}
              onToggleHidden={onToggleHidden}
              onToggleLocked={onToggleLocked}
              onCommitRename={onCommitRename}
              onCancelRename={onCancelRename}
              registerRow={registerRow}
            />
          ))
        : null}
    </div>
  );
}
