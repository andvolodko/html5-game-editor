import { useMemo, useState } from "react";
import type { ComponentCategoryGroup } from "@game-editor/game-components";

interface AddComponentMenuProps {
  groups: ComponentCategoryGroup[];
  onAdd: (scriptId: string) => void;
  disabled?: boolean;
}

export function AddComponentMenu({
  groups,
  onAdd,
  disabled,
}: AddComponentMenuProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return groups;
    }
    return groups
      .map((group) => ({
        ...group,
        definitions: group.definitions.filter(
          (def) =>
            def.displayName.toLowerCase().includes(q) ||
            def.id.toLowerCase().includes(q),
        ),
      }))
      .filter((group) => group.definitions.length > 0);
  }, [groups, query]);

  const empty = groups.length === 0;

  return (
    <div className="add-component">
      <button
        type="button"
        className="add-component-btn"
        disabled={disabled || empty}
        onClick={() => setOpen((prev) => !prev)}
      >
        Add Component
      </button>
      {empty ? (
        <p className="panel-hint">No script components registered for this project.</p>
      ) : null}
      {open && !empty ? (
        <div className="add-component-popover">
          <input
            className="add-component-search"
            placeholder="Search components…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
          <div className="add-component-list">
            {filtered.length === 0 ? (
              <p className="panel-hint">No matches</p>
            ) : (
              filtered.map((group) => (
                <div key={group.category} className="add-component-group">
                  <p className="add-component-group-title">{group.category}</p>
                  {group.definitions.map((def) => (
                    <button
                      key={def.id}
                      type="button"
                      className="add-component-item"
                      onClick={() => {
                        onAdd(def.id);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <span>{def.displayName}</span>
                      <span className="mono add-component-id">{def.id}</span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
