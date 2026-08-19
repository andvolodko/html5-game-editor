import type {
  ComponentDefinition,
  ComponentPropertyDefinition,
  DynamicEnumSource,
} from "@game-editor/game-components";
import type { ScriptComponentData } from "@game-editor/scene";
import {
  AssetSelectField,
  BooleanField,
  EnumField,
  NumberField,
  StringField,
} from "./fields/inspector-fields";
import { InspectorComponentHeaderActions } from "./InspectorComponentHeaderActions";

export interface DynamicEnumOptions {
  scenes: readonly string[];
  busEvents: readonly { id: string; label: string }[];
  gltfAnimations: readonly string[];
}

interface ScriptComponentSectionProps {
  component: ScriptComponentData;
  definition: ComponentDefinition | undefined;
  dynamicOptions: DynamicEnumOptions;
  enabled: boolean;
  enabledOverridden?: boolean;
  onEnabledCommit: (enabled: boolean) => void;
  onPropertyCommit: (key: string, value: unknown) => void;
  onCopy: () => void;
  onRemove: () => void;
}

export function ScriptComponentSection({
  component,
  definition,
  dynamicOptions,
  enabled,
  enabledOverridden,
  onEnabledCommit,
  onPropertyCommit,
  onCopy,
  onRemove,
}: ScriptComponentSectionProps) {
  const title = definition?.displayName ?? component.scriptId;

  return (
    <section className="inspector-section">
      <div className="inspector-section-header">
        <label
          className={
            enabledOverridden
              ? "inspector-section-header-title inspector-field-overridden"
              : "inspector-section-header-title"
          }
        >
          <input
            type="checkbox"
            checked={enabled}
            title="Enabled"
            aria-label="Enabled"
            onChange={(event) => onEnabledCommit(event.target.checked)}
          />
          <h3>{title}</h3>
        </label>
        <InspectorComponentHeaderActions onCopy={onCopy} onRemove={onRemove} />
      </div>
      {!definition ? (
        <p className="panel-error">
          Definition missing for <span className="mono">{component.scriptId}</span>
        </p>
      ) : (
        <div
          className={
            enabled ? "inspector-grid" : "inspector-grid inspector-section-disabled"
          }
        >
          {Object.entries(definition.properties).map(([key, field]) => (
            <ScriptPropertyField
              key={key}
              name={key}
              field={field}
              value={component.properties[key]}
              dynamicOptions={dynamicOptions}
              onCommit={(value) => onPropertyCommit(key, value)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ScriptPropertyField({
  name,
  field,
  value,
  dynamicOptions,
  onCommit,
}: {
  name: string;
  field: ComponentPropertyDefinition;
  value: unknown;
  dynamicOptions: DynamicEnumOptions;
  onCommit: (value: unknown) => void;
}) {
  const label = humanizePropertyKey(name);
  const control = renderScriptPropertyControl(
    label,
    field,
    value,
    dynamicOptions,
    onCommit,
  );
  if (!field.description) {
    return control;
  }
  return <div title={field.description}>{control}</div>;
}

function renderScriptPropertyControl(
  label: string,
  field: ComponentPropertyDefinition,
  value: unknown,
  dynamicOptions: DynamicEnumOptions,
  onCommit: (value: unknown) => void,
) {
  switch (field.kind) {
    case "number": {
      const num =
        typeof value === "number" && Number.isFinite(value)
          ? value
          : field.default;
      return (
        <NumberField label={label} value={num} onCommit={onCommit} />
      );
    }
    case "string": {
      const str = typeof value === "string" ? value : field.default;
      return (
        <StringField label={label} value={str} onCommit={onCommit} />
      );
    }
    case "boolean": {
      const bool = typeof value === "boolean" ? value : field.default;
      return (
        <BooleanField label={label} value={bool} onCommit={onCommit} />
      );
    }
    case "enum": {
      const selected =
        typeof value === "string" && field.options.includes(value)
          ? value
          : field.default;
      return (
        <EnumField
          label={label}
          value={selected}
          options={field.options}
          onCommit={onCommit}
        />
      );
    }
    case "dynamicEnum": {
      return (
        <DynamicEnumPropertyField
          label={label}
          fieldDefault={field.default}
          source={field.source}
          value={value}
          dynamicOptions={dynamicOptions}
          onCommit={onCommit}
        />
      );
    }
    case "asset": {
      const selected =
        typeof value === "string" && value.length > 0 ? value : undefined;
      return (
        <AssetSelectField
          label={label}
          value={selected}
          kind={field.assetType}
          onCommit={(next) => onCommit(next ?? "")}
        />
      );
    }
    default: {
      const _exhaustive: never = field;
      return _exhaustive;
    }
  }
}

function DynamicEnumPropertyField({
  label,
  fieldDefault,
  source,
  value,
  dynamicOptions,
  onCommit,
}: {
  label: string;
  fieldDefault: string;
  source: DynamicEnumSource;
  value: unknown;
  dynamicOptions: DynamicEnumOptions;
  onCommit: (value: unknown) => void;
}) {
  const options = resolveDynamicEnumOptions(source, dynamicOptions, value, fieldDefault);
  const selected =
    typeof value === "string" && options.some((o) => o.value === value)
      ? value
      : options[0]?.value ?? fieldDefault;

  return (
    <label>
      {label}
      <select
        value={selected}
        onChange={(event) => onCommit(event.target.value)}
        disabled={options.length === 0}
      >
        {options.length === 0 ? (
          <option value="">No options</option>
        ) : (
          options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))
        )}
      </select>
    </label>
  );
}

function resolveDynamicEnumOptions(
  source: DynamicEnumSource,
  dynamicOptions: DynamicEnumOptions,
  value: unknown,
  fieldDefault: string,
): { value: string; label: string }[] {
  let options: { value: string; label: string }[] = [];
  switch (source) {
    case "scenes":
      options = dynamicOptions.scenes.map((id) => ({ value: id, label: id }));
      break;
    case "busEvents":
      options = dynamicOptions.busEvents.map((event) => ({
        value: event.id,
        label: event.label,
      }));
      break;
    case "gltfAnimations":
      options = dynamicOptions.gltfAnimations.map((name) => ({
        value: name,
        label: name,
      }));
      break;
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }

  const current = typeof value === "string" ? value : fieldDefault;
  if (
    current.length > 0 &&
    !options.some((option) => option.value === current)
  ) {
    options = [{ value: current, label: `(missing) ${current}` }, ...options];
  }
  return options;
}

function humanizePropertyKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}
