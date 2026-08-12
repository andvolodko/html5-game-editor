import type { VisualComponentData } from "@game-editor/scene";
import {
  BooleanField,
  ColorField,
  EnumField,
  NumberField,
  StringField,
} from "../fields/inspector-fields";
import type { VisualCommit } from "./types";

export function TextStyleFields({
  visual,
  commit,
}: {
  visual: Extract<VisualComponentData, { type: "Text" | "HTMLText" }>;
  commit: VisualCommit;
}) {
  return (
    <>
      <StringField
        label="Text"
        value={visual.text}
        onCommit={(text) => commit({ text })}
      />
      <StringField
        label="Font Family"
        value={visual.style.fontFamily}
        onCommit={(fontFamily) =>
          commit({ style: { ...visual.style, fontFamily } })
        }
      />
      <NumberField
        label="Font Size"
        value={visual.style.fontSize}
        onCommit={(fontSize) =>
          commit({ style: { ...visual.style, fontSize } })
        }
      />
      <ColorField
        label="Fill"
        value={visual.style.fill}
        onCommit={(fill) => commit({ style: { ...visual.style, fill } })}
      />
      <EnumField
        label="Align"
        value={visual.style.align}
        options={["left", "center", "right"]}
        onCommit={(align) => commit({ style: { ...visual.style, align } })}
      />
      <BooleanField
        label="Word Wrap"
        value={visual.style.wordWrap}
        onCommit={(wordWrap) =>
          commit({ style: { ...visual.style, wordWrap } })
        }
      />
      <NumberField
        label="Word Wrap Width"
        value={visual.style.wordWrapWidth}
        onCommit={(wordWrapWidth) =>
          commit({ style: { ...visual.style, wordWrapWidth } })
        }
      />
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
      <StringField
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
