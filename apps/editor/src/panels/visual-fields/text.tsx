import {
  applyTextStyleWebFont,
  compactTextStyleFill,
  DEFAULT_TEXT_FILL,
  findNodeById,
  TEXT_ALIGN_OPTIONS,
  TEXT_BASELINE_OPTIONS,
  TEXT_FONT_STYLE_OPTIONS,
  TEXT_FONT_VARIANT_OPTIONS,
  TEXT_FONT_WEIGHT_OPTIONS,
  TEXT_STROKE_JOIN_OPTIONS,
  TEXT_WHITE_SPACE_OPTIONS,
  textStyleFillStops,
  type TextStyleData,
  type VisualComponentData,
} from "@game-editor/scene";
import { isInspectorPropertyOverridden } from "../prefab-override-flag";
import {
  AssetSelectField,
  BooleanField,
  ColorField,
  EnumField,
  InspectorFieldRow,
  NumberField,
  StringField,
  TextAreaField,
} from "../fields/inspector-fields";
import type { VisualCommit } from "./types";
import { useEditor } from "../../editor-context";

type StyledTextVisual = Extract<VisualComponentData, { type: "Text" | "HTMLText" }>;

const MIN_FILL_STOPS = 1;

function FillStopsField({
  fill,
  onCommit,
}: {
  fill: TextStyleData["fill"];
  onCommit: (fill: TextStyleData["fill"]) => void;
}) {
  const stops = textStyleFillStops(fill);
  return (
    <>
      {stops.map((color, index) => (
        <ColorField
          key={index}
          label={stops.length === 1 ? "Fill" : `Fill Stop ${index + 1}`}
          value={color}
          onCommit={(next) => {
            const updated = [...stops];
            updated[index] = next;
            onCommit(compactTextStyleFill(updated));
          }}
        />
      ))}
      <div className="inspector-fill-stops-actions">
        <button
          type="button"
          className="inspector-remove-btn"
          onClick={() => {
            const last = stops[stops.length - 1] ?? DEFAULT_TEXT_FILL;
            onCommit(compactTextStyleFill([...stops, last]));
          }}
        >
          Add fill stop
        </button>
        {stops.length > MIN_FILL_STOPS ? (
          <button
            type="button"
            className="inspector-remove-btn"
            onClick={() => onCommit(compactTextStyleFill(stops.slice(0, -1)))}
          >
            Remove fill stop
          </button>
        ) : null}
      </div>
    </>
  );
}

export function TextStyleFields({
  visual,
  commit,
  nodeId,
}: {
  visual: StyledTextVisual;
  commit: VisualCommit;
  nodeId: string;
}) {
  const patchStyle = (partial: Partial<TextStyleData>) =>
    commit({ style: { ...visual.style, ...partial } });
  const editor = useEditor();
  const scene = editor.getScene();
  const node = findNodeById(scene, nodeId);

  return (
    <>
      <TextAreaField
        label="Text"
        value={visual.text}
        overridden={
          node !== undefined &&
          isInspectorPropertyOverridden(scene, node, visual.id, "text")
        }
        onCommit={(text) => commit({ text })}
      />
      <AssetSelectField
        label="Web Font"
        kind="webfont"
        value={visual.style.fontAssetId}
        onCommit={(fontAssetId) => {
          if (fontAssetId === undefined) {
            commit({ style: applyTextStyleWebFont(visual.style, undefined) });
            return;
          }
          const asset = editor.assets.get(fontAssetId);
          const fontFamily =
            asset?.metadata.kind === "webfont"
              ? asset.metadata.fontFamily
              : visual.style.fontFamily;
          commit({
            style: applyTextStyleWebFont(visual.style, {
              fontAssetId,
              fontFamily,
            }),
          });
        }}
      />
      <InspectorFieldRow>
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
      </InspectorFieldRow>
      <InspectorFieldRow>
        <EnumField
          label="Weight"
          value={visual.style.fontWeight}
          options={TEXT_FONT_WEIGHT_OPTIONS}
          onCommit={(fontWeight) => patchStyle({ fontWeight })}
        />
        <EnumField
          label="Style"
          value={visual.style.fontStyle}
          options={TEXT_FONT_STYLE_OPTIONS}
          onCommit={(fontStyle) => patchStyle({ fontStyle })}
        />
        <EnumField
          label="Variant"
          value={visual.style.fontVariant}
          options={TEXT_FONT_VARIANT_OPTIONS}
          onCommit={(fontVariant) => patchStyle({ fontVariant })}
        />
      </InspectorFieldRow>
      <FillStopsField
        fill={visual.style.fill}
        onCommit={(fill) => patchStyle({ fill })}
      />
      <InspectorFieldRow>
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
      </InspectorFieldRow>
      <InspectorFieldRow>
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
      </InspectorFieldRow>
      <InspectorFieldRow>
        <BooleanField
          label="Word Wrap"
          value={visual.style.wordWrap}
          onCommit={(wordWrap) => patchStyle({ wordWrap })}
        />
        <NumberField
          label="Wrap Width"
          value={visual.style.wordWrapWidth}
          onCommit={(wordWrapWidth) => patchStyle({ wordWrapWidth })}
        />
      </InspectorFieldRow>
      <InspectorFieldRow>
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
      </InspectorFieldRow>
      {visual.type === "Text" ? (
        <InspectorFieldRow>
          <NumberField
            label="Padding"
            value={visual.style.padding}
            onCommit={(padding) => patchStyle({ padding })}
          />
          <EnumField
            label="Baseline"
            value={visual.style.textBaseline}
            options={TEXT_BASELINE_OPTIONS}
            onCommit={(textBaseline) => patchStyle({ textBaseline })}
          />
          <BooleanField
            label="Trim"
            value={visual.style.trim}
            onCommit={(trim) => patchStyle({ trim })}
          />
        </InspectorFieldRow>
      ) : (
        <NumberField
          label="Padding"
          value={visual.style.padding}
          onCommit={(padding) => patchStyle({ padding })}
        />
      )}
      <InspectorFieldRow>
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
      </InspectorFieldRow>
      {visual.type === "Text" ? (
        <InspectorFieldRow>
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
        </InspectorFieldRow>
      ) : null}
      <BooleanField
        label="Drop Shadow"
        value={visual.style.dropShadow}
        onCommit={(dropShadow) => patchStyle({ dropShadow })}
      />
      {visual.style.dropShadow ? (
        <>
          <InspectorFieldRow>
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
          </InspectorFieldRow>
          <InspectorFieldRow>
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
          </InspectorFieldRow>
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
      <AssetSelectField
        label="Bitmap Font"
        kind="font"
        value={visual.assetId}
        onCommit={(assetId) => commit({ assetId })}
      />
      <InspectorFieldRow>
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
      </InspectorFieldRow>
    </>
  );
}
