import { useEffect, useState } from "react";
import {
  composeProjectBackgroundHex,
  DEFAULT_PROJECT_BACKGROUND,
  PROJECT_BACKGROUND_ALPHA_MAX,
  PROJECT_BACKGROUND_ALPHA_MIN,
  projectBackgroundRgbHex,
  projectBackgroundToPixiAlpha,
} from "@game-editor/project";
import {
  formatInspectorNumber,
  inspectorNumberUnchanged,
} from "./fields/format-inspector-number";
import { InspectorFieldRow } from "./fields/inspector-fields";

const ALPHA_INPUT_STEP = 0.01;

export function ProjectBackgroundField({
  value,
  disabled,
  onCommit,
}: {
  value: string;
  disabled: boolean;
  onCommit: (next: string) => void;
}) {
  const rgb =
    projectBackgroundRgbHex(value) ??
    projectBackgroundRgbHex(DEFAULT_PROJECT_BACKGROUND) ??
    DEFAULT_PROJECT_BACKGROUND;
  const alpha = safeBackgroundAlpha(value);
  const [alphaDraft, setAlphaDraft] = useState(formatInspectorNumber(alpha));

  useEffect(() => {
    setAlphaDraft(formatInspectorNumber(alpha));
  }, [alpha, value]);

  const commitComposed = (nextRgb: string, nextAlpha: number): void => {
    const composed = composeProjectBackgroundHex(nextRgb, nextAlpha);
    if (!composed || composed === value) {
      return;
    }
    onCommit(composed);
  };

  const commitAlphaDraft = (): void => {
    if (inspectorNumberUnchanged(alphaDraft, alpha)) {
      setAlphaDraft(formatInspectorNumber(alpha));
      return;
    }
    const next = Number(alphaDraft);
    if (Number.isNaN(next)) {
      setAlphaDraft(formatInspectorNumber(alpha));
      return;
    }
    const clamped = Math.min(
      PROJECT_BACKGROUND_ALPHA_MAX,
      Math.max(PROJECT_BACKGROUND_ALPHA_MIN, next),
    );
    setAlphaDraft(formatInspectorNumber(clamped));
    commitComposed(rgb, clamped);
  };

  return (
    <InspectorFieldRow>
      <label>
        Background
        <input
          type="color"
          value={rgb}
          disabled={disabled}
          onChange={(event) => {
            const nextRgb = projectBackgroundRgbHex(event.target.value);
            if (!nextRgb) {
              return;
            }
            commitComposed(nextRgb, alpha);
          }}
        />
      </label>
      <label>
        Alpha
        <input
          type="number"
          min={PROJECT_BACKGROUND_ALPHA_MIN}
          max={PROJECT_BACKGROUND_ALPHA_MAX}
          step={ALPHA_INPUT_STEP}
          value={alphaDraft}
          disabled={disabled}
          onChange={(event) => {
            setAlphaDraft(event.target.value);
          }}
          onBlur={commitAlphaDraft}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
        />
      </label>
    </InspectorFieldRow>
  );
}

function safeBackgroundAlpha(hex: string): number {
  try {
    return projectBackgroundToPixiAlpha(hex);
  } catch {
    return PROJECT_BACKGROUND_ALPHA_MAX;
  }
}
