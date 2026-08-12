import type { VisualComponentData } from "@game-editor/scene";
import {
  AssetSelectField,
  BooleanField,
  ColorField,
  NumberField,
  StringField,
} from "../fields/inspector-fields";
import type { VisualCommit } from "./types";

export function SpriteFields({
  visual,
  commit,
}: {
  visual: Extract<VisualComponentData, { type: "Sprite" }>;
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
      <ColorField
        label="Tint"
        value={visual.tint ?? 0xffffff}
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
      <NumberField label="Width" value={visual.width} onCommit={(width) => commit({ width })} />
      <NumberField label="Height" value={visual.height} onCommit={(height) => commit({ height })} />
      <NumberField label="Left Width" value={visual.leftWidth} onCommit={(leftWidth) => commit({ leftWidth })} />
      <NumberField label="Right Width" value={visual.rightWidth} onCommit={(rightWidth) => commit({ rightWidth })} />
      <NumberField label="Top Height" value={visual.topHeight} onCommit={(topHeight) => commit({ topHeight })} />
      <NumberField label="Bottom Height" value={visual.bottomHeight} onCommit={(bottomHeight) => commit({ bottomHeight })} />
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
      <NumberField label="Width" value={visual.width} onCommit={(width) => commit({ width })} />
      <NumberField label="Height" value={visual.height} onCommit={(height) => commit({ height })} />
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
}: {
  visual: Extract<VisualComponentData, { type: "AnimatedSprite" }>;
  commit: VisualCommit;
}) {
  return (
    <>
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
    </>
  );
}
