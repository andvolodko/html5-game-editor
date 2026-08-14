import { useEffect, useState } from "react";
import type { AssetType } from "@game-editor/assets";
import { useEditorState } from "../../hooks/useEditorState";
import {
  ASSET_SELECT_NONE_LABEL,
  ASSET_SELECT_NONE_VALUE,
  buildAssetSelectOptions,
} from "./asset-select-options";
import {
  formatInspectorNumber,
  inspectorNumberUnchanged,
} from "./format-inspector-number";
import { uniqueSelectOptions } from "./unique-select-options";

function displayInspectorNumber(value: number, integer?: boolean): string {
  return integer ? String(value) : formatInspectorNumber(value);
}

export function NumberField({
  label,
  value,
  onCommit,
  integer,
}: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  integer?: boolean;
}) {
  const [draft, setDraft] = useState(displayInspectorNumber(value, integer));
  useEffect(
    () => setDraft(displayInspectorNumber(value, integer)),
    [value, integer],
  );
  const commit = () => {
    const display = displayInspectorNumber(value, integer);
    if (integer) {
      const next = Number.parseInt(draft, 10);
      if (Number.isNaN(next) || next === value) {
        setDraft(display);
        return;
      }
      onCommit(next);
      return;
    }
    if (inspectorNumberUnchanged(draft, value)) {
      setDraft(display);
      return;
    }
    const next = Number(draft);
    if (Number.isNaN(next)) {
      setDraft(display);
      return;
    }
    onCommit(next);
  };
  return (
    <label>
      {label}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
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
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  rows?: number;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft === value) {
      return;
    }
    onCommit(draft);
  };
  return (
    <label>
      {label}
      <textarea
        rows={rows}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
      />
    </label>
  );
}

export function StringField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft === value) {
      return;
    }
    onCommit(draft);
  };
  return (
    <label>
      {label}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
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
}: {
  label: string;
  value: boolean;
  onCommit: (value: boolean) => void;
}) {
  return (
    <label className="inspector-checkbox">
      {label}
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
}: {
  label: string;
  value: T;
  options: readonly T[];
  onCommit: (value: T) => void;
}) {
  return (
    <label>
      {label}
      <select
        value={value}
        onChange={(e) => onCommit(e.target.value as T)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
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
}: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
}) {
  const hex = `#${value.toString(16).padStart(6, "0")}`;
  return (
    <label>
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
