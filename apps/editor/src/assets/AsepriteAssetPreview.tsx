import { useEffect, useRef, useState } from "react";
import type { AssetRecord } from "@game-editor/assets";
import { mountAsepritePreview, type AsepritePreviewHandle } from "@game-editor/renderer-pixi";
import type { Editor } from "@game-editor/editor-core";
import { uniqueSelectOptions } from "../panels/fields/unique-select-options";

export function AsepriteAssetPreview({
  asset,
  editor,
}: {
  asset: AssetRecord;
  editor: Editor;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<AsepritePreviewHandle | undefined>(undefined);
  const tags =
    asset.metadata.kind === "aseprite"
      ? uniqueSelectOptions(asset.metadata.tags.map((tag) => tag.name))
      : [];
  const [animation, setAnimation] = useState(tags[0]);
  const compileError =
    asset.metadata.kind === "aseprite" ? asset.metadata.compileError : undefined;
  const jsonUrl =
    asset.metadata.kind === "aseprite"
      ? editor.assets.resolveAsepriteUrls(asset.id)?.jsonUrl
      : undefined;

  useEffect(() => {
    setAnimation(tags[0]);
  }, [asset.id, tags[0]]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !jsonUrl || compileError) {
      return;
    }
    let cancelled = false;
    void mountAsepritePreview({
      parent: host,
      jsonUrl,
      animation,
      playing: tags.length > 0,
    }).then((handle) => {
      if (cancelled) {
        handle.destroy();
        return;
      }
      handleRef.current = handle;
    });
    return () => {
      cancelled = true;
      handleRef.current?.destroy();
      handleRef.current = undefined;
      host.replaceChildren();
    };
  }, [jsonUrl, asset.id, compileError]);

  useEffect(() => {
    void handleRef.current?.setAnimation(animation);
  }, [animation]);

  return (
    <div className="asset-live-preview">
      <div className="asset-live-preview-label">Aseprite Sprite</div>
      {compileError ? (
        <p className="panel-error">{compileError}</p>
      ) : (
        <>
          <div ref={hostRef} className="asset-live-preview-stage" />
          {tags.length > 0 ? (
            <label className="asset-live-preview-anim">
              Animation
              <select
                value={animation ?? ""}
                onChange={(event) => {
                  const next = event.target.value;
                  setAnimation(next.length > 0 ? next : undefined);
                }}
              >
                {tags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </>
      )}
    </div>
  );
}
