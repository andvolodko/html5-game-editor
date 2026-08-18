import type { Editor } from "@game-editor/editor-core";
import {
  DEFAULT_SPRITE_SIZE,
  findNodeById,
  type VisualComponentData,
} from "@game-editor/scene";
import { isInspectorPropertyOverridden } from "../prefab-override-flag";
import { rasterAssetDisplaySize } from "@game-editor/assets";
import {
  AssetSelectField,
  BooleanField,
  ColorField,
  InspectorFieldRow,
  NumberField,
  OptionalSelectField,
  StringField,
} from "../fields/inspector-fields";
import { uniqueSelectOptions } from "../fields/unique-select-options";
import type { VisualCommit } from "./types";

export function SpriteFields({
  visual,
  commit,
  editor,
  nodeId,
}: {
  visual: Extract<VisualComponentData, { type: "Sprite" }>;
  commit: VisualCommit;
  editor: Editor;
  nodeId: string;
}) {
  return (
    <>
      <AssetSelectField
        label="Texture"
        kind={["texture", "aseprite"]}
        value={visual.assetId}
        onCommit={(assetId) => {
          const next = assetId ? editor.assets.get(assetId) : undefined;
          const size = next ? rasterAssetDisplaySize(next) : undefined;
          commit({
            assetId,
            ...(size ?? {}),
          });
        }}
      />
      <InspectorFieldRow>
        <NumberField
          label="Width"
          value={visual.width}
          onCommit={(width) => commit({ width })}
        />
        <NumberField
          label="Height"
          value={visual.height}
          onCommit={(height) => commit({ height })}
        />
      </InspectorFieldRow>
      <ColorField
        label="Tint"
        value={visual.tint ?? 0xffffff}
        overridden={isSpriteTintOverridden(editor, nodeId, visual.id)}
        onCommit={(tint) => commit({ tint })}
      />
    </>
  );
}

export function NineSliceFields({
  visual,
  commit,
}: {
  visual: Extract<VisualComponentData, { type: "NineSliceSprite" }>;
  commit: VisualCommit;
}) {
  return (
    <>
      <AssetSelectField
        label="Texture"
        kind="texture"
        value={visual.assetId}
        onCommit={(assetId) => commit({ assetId })}
      />
      <InspectorFieldRow>
        <NumberField label="Width" value={visual.width} onCommit={(width) => commit({ width })} />
        <NumberField label="Height" value={visual.height} onCommit={(height) => commit({ height })} />
      </InspectorFieldRow>
      <InspectorFieldRow>
        <NumberField label="Left Width" value={visual.leftWidth} onCommit={(leftWidth) => commit({ leftWidth })} />
        <NumberField label="Right Width" value={visual.rightWidth} onCommit={(rightWidth) => commit({ rightWidth })} />
      </InspectorFieldRow>
      <InspectorFieldRow>
        <NumberField label="Top Height" value={visual.topHeight} onCommit={(topHeight) => commit({ topHeight })} />
        <NumberField label="Bottom Height" value={visual.bottomHeight} onCommit={(bottomHeight) => commit({ bottomHeight })} />
      </InspectorFieldRow>
    </>
  );
}

export function TilingFields({
  visual,
  commit,
}: {
  visual: Extract<VisualComponentData, { type: "TilingSprite" }>;
  commit: VisualCommit;
}) {
  return (
    <>
      <AssetSelectField
        label="Texture"
        kind="texture"
        value={visual.assetId}
        onCommit={(assetId) => commit({ assetId })}
      />
      <InspectorFieldRow>
        <NumberField label="Width" value={visual.width} onCommit={(width) => commit({ width })} />
        <NumberField label="Height" value={visual.height} onCommit={(height) => commit({ height })} />
      </InspectorFieldRow>
      <InspectorFieldRow>
        <NumberField
          label="Tile Position X"
          value={visual.tilePosition.x}
          onCommit={(x) => commit({ tilePosition: { x, y: visual.tilePosition.y } })}
        />
        <NumberField
          label="Tile Position Y"
          value={visual.tilePosition.y}
          onCommit={(y) => commit({ tilePosition: { x: visual.tilePosition.x, y } })}
        />
      </InspectorFieldRow>
      <InspectorFieldRow>
        <NumberField
          label="Tile Scale X"
          value={visual.tileScale.x}
          onCommit={(x) => commit({ tileScale: { x, y: visual.tileScale.y } })}
        />
        <NumberField
          label="Tile Scale Y"
          value={visual.tileScale.y}
          onCommit={(y) => commit({ tileScale: { x: visual.tileScale.x, y } })}
        />
      </InspectorFieldRow>
      <NumberField
        label="Tile Rotation"
        value={visual.tileRotation}
        onCommit={(tileRotation) => commit({ tileRotation })}
      />
    </>
  );
}

export function AnimatedSpriteFields({
  visual,
  commit,
  editor,
}: {
  visual: Extract<VisualComponentData, { type: "AnimatedSprite" }>;
  commit: VisualCommit;
  editor: Editor;
}) {
  const asset = visual.assetId ? editor.assets.get(visual.assetId) : undefined;
  const asepriteTags =
    asset?.metadata.kind === "aseprite"
      ? uniqueSelectOptions(asset.metadata.tags.map((tag) => tag.name))
      : [];
  const isAseprite = asset?.metadata.kind === "aseprite";

  return (
    <>
      <AssetSelectField
        label="Aseprite Asset"
        kind="aseprite"
        value={visual.assetId}
        onCommit={(assetId) => {
          const next = assetId ? editor.assets.get(assetId) : undefined;
          const animation =
            next?.metadata.kind === "aseprite"
              ? next.metadata.tags[0]?.name
              : undefined;
          const size = next ? rasterAssetDisplaySize(next) : undefined;
          commit({
            assetId,
            animation,
            frames: [],
            ...(size ?? {}),
          });
        }}
      />
      {isAseprite ? (
        <OptionalSelectField
          label="Animation"
          value={visual.animation}
          options={asepriteTags}
          onCommit={(animation) => commit({ animation })}
        />
      ) : (
        <StringField
          label="Frames (comma-separated asset IDs)"
          value={visual.frames.join(", ")}
          onCommit={(raw) => {
            const frames = raw
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            commit({ frames });
          }}
        />
      )}
      <InspectorFieldRow>
        <NumberField
          label="Width"
          value={visual.width ?? DEFAULT_SPRITE_SIZE}
          onCommit={(width) => commit({ width })}
        />
        <NumberField
          label="Height"
          value={visual.height ?? DEFAULT_SPRITE_SIZE}
          onCommit={(height) => commit({ height })}
        />
      </InspectorFieldRow>
      <InspectorFieldRow>
        <NumberField
          label="Animation Speed"
          value={visual.animationSpeed}
          onCommit={(animationSpeed) => commit({ animationSpeed })}
        />
        <BooleanField
          label="Loop"
          value={visual.loop}
          onCommit={(loop) => commit({ loop })}
        />
        <BooleanField
          label="Playing"
          value={visual.playing}
          onCommit={(playing) => commit({ playing })}
        />
      </InspectorFieldRow>
    </>
  );
}

function isSpriteTintOverridden(
  editor: Editor,
  nodeId: string,
  componentId: string,
): boolean {
  const scene = editor.getScene();
  const node = findNodeById(scene, nodeId);
  if (!node) {
    return false;
  }
  return isInspectorPropertyOverridden(scene, node, componentId, "tint");
}
