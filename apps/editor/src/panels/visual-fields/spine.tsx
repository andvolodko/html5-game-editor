import type { Editor } from "@game-editor/editor-core";
import type { VisualComponentData } from "@game-editor/scene";
import {
  AssetSelectField,
  BooleanField,
  NumberField,
  OptionalSelectField,
} from "../fields/inspector-fields";
import type { VisualCommit } from "./types";

export function SpineFields({
  visual,
  commit,
  editor,
}: {
  visual: Extract<VisualComponentData, { type: "Spine" }>;
  commit: VisualCommit;
  editor: Editor;
}) {
  const asset = visual.assetId ? editor.assets.get(visual.assetId) : undefined;
  const skins =
    asset?.metadata.kind === "spine" ? asset.metadata.skins : [];
  const animations =
    asset?.metadata.kind === "spine" ? asset.metadata.animations : [];

  return (
    <>
      <AssetSelectField
        label="Spine Asset"
        kind="spine"
        value={visual.assetId}
        onCommit={(assetId) => commit({ assetId })}
      />
      <OptionalSelectField
        label="Skin"
        value={visual.skin}
        options={skins}
        onCommit={(skin) => commit({ skin })}
      />
      <OptionalSelectField
        label="Animation"
        value={visual.animation}
        options={animations}
        onCommit={(animation) => commit({ animation })}
      />
      <BooleanField
        label="Loop"
        value={visual.loop}
        onCommit={(loop) => commit({ loop })}
      />
      <NumberField
        label="Time Scale"
        value={visual.timeScale}
        onCommit={(timeScale) => commit({ timeScale })}
      />
      <BooleanField
        label="Playing"
        value={visual.playing}
        onCommit={(playing) => commit({ playing })}
      />
    </>
  );
}
