import type { ReactNode } from "react";
import type { AssetType } from "@game-editor/assets";
import { useEditorState } from "../../hooks/useEditorState";
import {
  ASSET_SELECT_NONE_LABEL,
  ASSET_SELECT_NONE_VALUE,
  buildAssetSelectOptions,
} from "./asset-select-options";
import {
  formatInspectorNumber,
  resolveInspectorNumberDraft,
} from "./format-inspector-number";
import { uniqueSelectOptions } from "./unique-select-options";
import { useInspectorBlurDraft } from "./inspector-blur-draft";

function displayInspectorNumber(value: number, integer?: boolean): string {
  return integer ? String(value) : formatInspectorNumber(value);
}

/** Side-by-side inspector fields (Position X/Y, Width/Height, …). */
export function InspectorFieldRow({ children }: { children: ReactNode }) {
  return <div className="inspector-field-row">{children}</div>;
}

export function NumberField({
  label,
  value,
  onCommit,
  integer,
  overridden,
  onResetOverride,
}: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  integer?: boolean;
  overridden?: boolean;
  onResetOverride?: () => void;
}) {
  const committedDisplay = displayInspectorNumber(value, integer);
  const { draft, setDraft, beginEdit, commit } = useInspectorBlurDraft(
    committedDisplay,
    { value, integer, onCommit },
    (text, bound) => {
      const resolved = resolveInspectorNumberDraft(
        text,
        bound.value,
        bound.integer,
      );
      if (resolved.kind === "revert") {
        return;
      }
      bound.onCommit(resolved.value);
    },
  );
  return (
    <label className={overridden ? "inspector-field-overridden" : undefined}>
      <span className="inspector-field-label-row">
        {label}
        {overridden && onResetOverride ? (
          <button
            type="button"
            className="inspector-reset-override"
            title="Reset to Base"
            onClick={(event) => {
              event.preventDefault();
              onResetOverride();
            }}
          >
            ↺
          </button>
        ) : null}
      </span>
      <input
        value={draft}
        onFocus={beginEdit}
        onChange={(e) => {
          beginEdit();
          setDraft(e.target.value);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
          }
        }}
      />
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onCommit,
  rows = 3,
  overridden,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  rows?: number;
  overridden?: boolean;
}) {
  const { draft, setDraft, beginEdit, commit } = useInspectorBlurDraft(
    value,
    { value, onCommit },
    (text, bound) => {
      if (text === bound.value) {
        return;
      }
      bound.onCommit(text);
    },
  );
  return (
    <label className={overridden ? "inspector-field-overridden" : undefined}>
      {label}
      <textarea
        rows={rows}
        value={draft}
        onFocus={beginEdit}
        onChange={(e) => {
          beginEdit();
          setDraft(e.target.value);
        }}
        onBlur={commit}
      />
    </label>
  );
}

export function StringField({
  label,
  value,
  onCommit,
  overridden,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  overridden?: boolean;
}) {
  const { draft, setDraft, beginEdit, commit } = useInspectorBlurDraft(
    value,
    { value, onCommit },
    (text, bound) => {
      if (text === bound.value) {
        return;
      }
      bound.onCommit(text);
    },
  );
  return (
    <label className={overridden ? "inspector-field-overridden" : undefined}>
      {label}
      <input
        value={draft}
        onFocus={beginEdit}
        onChange={(e) => {
          beginEdit();
          setDraft(e.target.value);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
          }
        }}
      />
    </label>
  );
}

/** Catalogue-backed asset picker; persists stable assetId only. */
export function AssetSelectField({
  label,
  value,
  kind,
  onCommit,
}: {
  label: string;
  value: string | undefined;
  kind: AssetType | readonly AssetType[];
  onCommit: (value: string | undefined) => void;
}) {
  const assets = useEditorState((editor) => editor.assets.getAll());
  const options = buildAssetSelectOptions(assets, kind, value);

  return (
    <label>
      {label}
      <select
        value={value ?? ASSET_SELECT_NONE_VALUE}
        onChange={(event) => {
          const next = event.target.value;
          onCommit(next.length > 0 ? next : undefined);
        }}
      >
        <option value={ASSET_SELECT_NONE_VALUE}>{ASSET_SELECT_NONE_LABEL}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function BooleanField({
  label,
  value,
  onCommit,
  overridden,
  onResetOverride,
}: {
  label: string;
  value: boolean;
  onCommit: (value: boolean) => void;
  overridden?: boolean;
  onResetOverride?: () => void;
}) {
  return (
    <label
      className={
        overridden
          ? "inspector-checkbox inspector-field-overridden"
          : "inspector-checkbox"
      }
    >
      <span className="inspector-field-label-row">
        {label}
        {overridden && onResetOverride ? (
          <button
            type="button"
            className="inspector-reset-override"
            title="Reset to Base"
            onClick={(event) => {
              event.preventDefault();
              onResetOverride();
            }}
          >
            ↺
          </button>
        ) : null}
      </span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onCommit(e.target.checked)}
      />
    </label>
  );
}

export function EnumField<T extends string>({
  label,
  value,
  options,
  onCommit,
  overridden,
  optionLabels,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onCommit: (value: T) => void;
  overridden?: boolean;
  optionLabels?: Partial<Record<T, string>>;
}) {
  return (
    <label className={overridden ? "inspector-field-overridden" : undefined}>
      {label}
      <select
        value={value}
        onChange={(e) => onCommit(e.target.value as T)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabels?.[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Optional string select with empty = undefined (Spine / Model3D / Aseprite clips). */
export function OptionalSelectField({
  label,
  value,
  options,
  emptyLabel = "(default)",
  onCommit,
}: {
  label: string;
  value: string | undefined;
  options: readonly string[];
  emptyLabel?: string;
  onCommit: (value: string | undefined) => void;
}) {
  const unique = uniqueSelectOptions(options);
  return (
    <label>
      {label}
      <select
        value={value ?? ""}
        onChange={(event) => {
          const next = event.target.value;
          onCommit(next.length > 0 ? next : undefined);
        }}
      >
        <option value="">{emptyLabel}</option>
        {unique.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ColorField({
  label,
  value,
  onCommit,
  overridden,
}: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  overridden?: boolean;
}) {
  const hex = `#${value.toString(16).padStart(6, "0")}`;
  return (
    <label className={overridden ? "inspector-field-overridden" : undefined}>
      {label}
      <input
        type="color"
        value={hex}
        onChange={(e) => {
          const next = Number.parseInt(e.target.value.slice(1), 16);
          if (!Number.isNaN(next)) {
            onCommit(next);
          }
        }}
      />
    </label>
  );
}
