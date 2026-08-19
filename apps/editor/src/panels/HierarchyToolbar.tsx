import { EyeIcon, LockIcon } from "../ui/hierarchy-icons";

export function HierarchyToolbar({
  query,
  anyHidden,
  anyLocked,
  onQueryChange,
  onToggleHidden,
  onToggleLocked,
}: {
  query: string;
  anyHidden: boolean;
  anyLocked: boolean;
  onQueryChange: (query: string) => void;
  onToggleHidden: () => void;
  onToggleLocked: () => void;
}) {
  const visibilityLabel = anyHidden ? "Show All" : "Hide All";
  const lockLabel = anyLocked ? "Unlock All" : "Lock All";

  return (
    <div className="panel-toolbar" role="toolbar" aria-label="Hierarchy">
      <input
        className="panel-search"
        type="search"
        placeholder="Search nodes…"
        value={query}
        aria-label="Search nodes"
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && query.length > 0) {
            event.preventDefault();
            onQueryChange("");
          }
        }}
      />
      <button
        type="button"
        className={["hierarchy-toolbar-btn", anyHidden ? "active" : ""]
          .filter(Boolean)
          .join(" ")}
        title={visibilityLabel}
        aria-label={visibilityLabel}
        aria-pressed={anyHidden}
        onClick={onToggleHidden}
      >
        <EyeIcon off={anyHidden} />
      </button>
      <button
        type="button"
        className={["hierarchy-toolbar-btn", anyLocked ? "active" : ""]
          .filter(Boolean)
          .join(" ")}
        title={lockLabel}
        aria-label={lockLabel}
        aria-pressed={anyLocked}
        onClick={onToggleLocked}
      >
        <LockIcon locked={anyLocked} />
      </button>
    </div>
  );
}
