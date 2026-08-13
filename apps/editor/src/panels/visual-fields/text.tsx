import {
  TEXT_ALIGN_OPTIONS,
  TEXT_BASELINE_OPTIONS,
  TEXT_FONT_STYLE_OPTIONS,
  TEXT_FONT_VARIANT_OPTIONS,
  TEXT_FONT_WEIGHT_OPTIONS,
  TEXT_STROKE_JOIN_OPTIONS,
  TEXT_WHITE_SPACE_OPTIONS,
  type TextStyleData,
  type VisualComponentData,
} from "@game-editor/scene";
import {
  BooleanField,
  ColorField,
  EnumField,
  NumberField,
  StringField,
  TextAreaField,
} from "../fields/inspector-fields";
import type { VisualCommit } from "./types";

type StyledTextVisual = Extract<VisualComponentData, { type: "Text" | "HTMLText" }>;

export function TextStyleFields({
  visual,
  commit,
}: {
  visual: StyledTextVisual;
  commit: VisualCommit;
}) {
  const patchStyle = (partial: Partial<TextStyleData>) =>
    commit({ style: { ...visual.style, ...partial } });

  return (
    <>
      <TextAreaField
        label="Text"
        value={visual.text}
        onCommit={(text) => commit({ text })}
      />
      <StringField
        label="Font Family"
        value={visual.style.fontFamily}
        onCommit={(fontFamily) => patchStyle({ fontFamily })}
      />
      <NumberField
        label="Font Size"
        value={visual.style.fontSize}
        onCommit={(fontSize) => patchStyle({ fontSize })}
      />
      <EnumField
        label="Font Weight"
        value={visual.style.fontWeight}
        options={TEXT_FONT_WEIGHT_OPTIONS}
        onCommit={(fontWeight) => patchStyle({ fontWeight })}
      />
      <EnumField
        label="Font Style"
        value={visual.style.fontStyle}
        options={TEXT_FONT_STYLE_OPTIONS}
        onCommit={(fontStyle) => patchStyle({ fontStyle })}
      />
      <EnumField
        label="Font Variant"
        value={visual.style.fontVariant}
        options={TEXT_FONT_VARIANT_OPTIONS}
        onCommit={(fontVariant) => patchStyle({ fontVariant })}
      />
      <ColorField
        label="Fill"
        value={visual.style.fill}
        onCommit={(fill) => patchStyle({ fill })}
      />
      <NumberField
        label="Fill Alpha"
        value={visual.style.fillAlpha}
        onCommit={(fillAlpha) => patchStyle({ fillAlpha })}
      />
      <EnumField
        label="Align"
        value={visual.style.align}
        options={TEXT_ALIGN_OPTIONS}
        onCommit={(align) => patchStyle({ align })}
      />
      <NumberField
        label="Letter Spacing"
        value={visual.style.letterSpacing}
        onCommit={(letterSpacing) => patchStyle({ letterSpacing })}
      />
      <NumberField
        label="Line Height"
        value={visual.style.lineHeight}
        onCommit={(lineHeight) => patchStyle({ lineHeight })}
      />
      {visual.type === "Text" ? (
        <NumberField
          label="Leading"
          value={visual.style.leading}
          onCommit={(leading) => patchStyle({ leading })}
        />
      ) : null}
      <BooleanField
        label="Word Wrap"
        value={visual.style.wordWrap}
        onCommit={(wordWrap) => patchStyle({ wordWrap })}
      />
      <NumberField
        label="Word Wrap Width"
        value={visual.style.wordWrapWidth}
        onCommit={(wordWrapWidth) => patchStyle({ wordWrapWidth })}
      />
      <BooleanField
        label="Break Words"
        value={visual.style.breakWords}
        onCommit={(breakWords) => patchStyle({ breakWords })}
      />
      <EnumField
        label="White Space"
        value={visual.style.whiteSpace}
        options={TEXT_WHITE_SPACE_OPTIONS}
        onCommit={(whiteSpace) => patchStyle({ whiteSpace })}
      />
      <NumberField
        label="Padding"
        value={visual.style.padding}
        onCommit={(padding) => patchStyle({ padding })}
      />
      {visual.type === "Text" ? (
        <>
          <EnumField
            label="Text Baseline"
            value={visual.style.textBaseline}
            options={TEXT_BASELINE_OPTIONS}
            onCommit={(textBaseline) => patchStyle({ textBaseline })}
          />
          <BooleanField
            label="Trim"
            value={visual.style.trim}
            onCommit={(trim) => patchStyle({ trim })}
          />
        </>
      ) : null}
      <ColorField
        label="Stroke Color"
        value={visual.style.strokeColor}
        onCommit={(strokeColor) => patchStyle({ strokeColor })}
      />
      <NumberField
        label="Stroke Alpha"
        value={visual.style.strokeAlpha}
        onCommit={(strokeAlpha) => patchStyle({ strokeAlpha })}
      />
      <NumberField
        label="Stroke Width"
        value={visual.style.strokeWidth}
        onCommit={(strokeWidth) => patchStyle({ strokeWidth })}
      />
      {visual.type === "Text" ? (
        <>
          <EnumField
            label="Stroke Join"
            value={visual.style.strokeJoin}
            options={TEXT_STROKE_JOIN_OPTIONS}
            onCommit={(strokeJoin) => patchStyle({ strokeJoin })}
          />
          <NumberField
            label="Miter Limit"
            value={visual.style.miterLimit}
            onCommit={(miterLimit) => patchStyle({ miterLimit })}
          />
        </>
      ) : null}
      <BooleanField
        label="Drop Shadow"
        value={visual.style.dropShadow}
        onCommit={(dropShadow) => patchStyle({ dropShadow })}
      />
      {visual.style.dropShadow ? (
        <>
          <ColorField
            label="Shadow Color"
            value={visual.style.dropShadowColor}
            onCommit={(dropShadowColor) => patchStyle({ dropShadowColor })}
          />
          <NumberField
            label="Shadow Alpha"
            value={visual.style.dropShadowAlpha}
            onCommit={(dropShadowAlpha) => patchStyle({ dropShadowAlpha })}
          />
          <NumberField
            label="Shadow Blur"
            value={visual.style.dropShadowBlur}
            onCommit={(dropShadowBlur) => patchStyle({ dropShadowBlur })}
          />
          <NumberField
            label="Shadow Distance"
            value={visual.style.dropShadowDistance}
            onCommit={(dropShadowDistance) =>
              patchStyle({ dropShadowDistance })
            }
          />
          <NumberField
            label="Shadow Angle (°)"
            value={visual.style.dropShadowAngle}
            onCommit={(dropShadowAngle) => patchStyle({ dropShadowAngle })}
          />
        </>
      ) : null}
    </>
  );
}

export function BitmapTextFields({
  visual,
  commit,
}: {
  visual: Extract<VisualComponentData, { type: "BitmapText" }>;
  commit: VisualCommit;
}) {
  return (
    <>
      <TextAreaField
        label="Text"
        value={visual.text}
        onCommit={(text) => commit({ text })}
      />
      <StringField
        label="Font Family"
        value={visual.fontFamily ?? ""}
        onCommit={(fontFamily) =>
          commit({
            fontFamily: fontFamily.trim().length > 0 ? fontFamily : undefined,
          })
        }
      />
      <NumberField
        label="Font Size"
        value={visual.fontSize}
        onCommit={(fontSize) => commit({ fontSize })}
      />
      <EnumField
        label="Align"
        value={visual.align}
        options={["left", "center", "right"]}
        onCommit={(align) => commit({ align })}
      />
      <NumberField
        label="Letter Spacing"
        value={visual.letterSpacing}
        onCommit={(letterSpacing) => commit({ letterSpacing })}
      />
      <p className="panel-hint">
        Bitmap fonts are not imported yet — assign a loaded font family name
        when available.
      </p>
    </>
  );
}
