import type { Dispatch, SetStateAction } from "react";
import type { Editor } from "@game-editor/editor-core";
import { InspectorFieldRow } from "./fields/inspector-fields";
import type {
  SpriteSizeDraft,
  Transform2DCommitTarget,
} from "./inspector-transform-commit";

interface Props {
  editor: Editor;
  sprite: NonNullable<Transform2DCommitTarget["sprite"]>;
  sizeDraft: SpriteSizeDraft;
  setSizeDraft: Dispatch<SetStateAction<SpriteSizeDraft | null>>;
  commitSize: () => void;
}

export function SpriteSizeInspector({
  editor,
  sprite,
  sizeDraft,
  setSizeDraft,
  commitSize,
}: Props) {
  const asset =
    sprite.assetId !== undefined ? editor.assets.get(sprite.assetId) : undefined;
  const assetUrl =
    sprite.assetId !== undefined
      ? editor.assets.getContentUrl(sprite.assetId)
      : undefined;

  return (
    <section className="inspector-section">
      <h3>Sprite</h3>
      {assetUrl ? (
        <img
          className="inspector-asset-thumb"
          src={assetUrl}
          alt={asset?.name ?? "asset"}
        />
      ) : (
        <p className="panel-error">
          Missing asset{sprite.assetId ? `: ${sprite.assetId}` : ""}
        </p>
      )}
      <div className="inspector-grid">
        <InspectorFieldRow>
          <label>
            Width
            <input
              value={sizeDraft.width}
              onChange={(event) => {
                setSizeDraft((current) =>
                  current
                    ? { ...current, width: event.target.value }
                    : current,
                );
              }}
              onBlur={commitSize}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitSize();
                }
              }}
            />
          </label>
          <label>
            Height
            <input
              value={sizeDraft.height}
              onChange={(event) => {
                setSizeDraft((current) =>
                  current
                    ? { ...current, height: event.target.value }
                    : current,
                );
              }}
              onBlur={commitSize}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitSize();
                }
              }}
            />
          </label>
        </InspectorFieldRow>
      </div>
      <dl className="inspector-meta">
        <div>
          <dt>Name</dt>
          <dd>{asset?.name ?? "—"}</dd>
        </div>
        <div>
          <dt>Asset ID</dt>
          <dd className="mono">{sprite.assetId ?? "—"}</dd>
        </div>
      </dl>
    </section>
  );
}
