import { EDITOR_THEME_DEFINITIONS, type EditorTheme } from "../theme/theme";

export function ThemePicker({
  value,
  onChange,
}: {
  value: EditorTheme;
  onChange: (theme: EditorTheme) => void;
}) {
  return (
    <div className="theme-grid" role="listbox" aria-label="Editor theme">
      {EDITOR_THEME_DEFINITIONS.map((definition) => {
        const selected = definition.id === value;
        return (
          <button
            key={definition.id}
            type="button"
            role="option"
            aria-selected={selected}
            title={definition.description}
            className={selected ? "theme-card selected" : "theme-card"}
            onClick={() => onChange(definition.id)}
          >
            <span className="theme-card-label">{definition.label}</span>
            <span className="theme-card-swatches" aria-hidden="true">
              {definition.preview.map((color) => (
                <span
                  key={color}
                  className="theme-card-swatch"
                  style={{ background: color }}
                />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
