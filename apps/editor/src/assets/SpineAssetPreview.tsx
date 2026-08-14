import { useEffect, useRef, useState } from "react";
import type { AssetRecord } from "@game-editor/assets";
import { mountSpinePreview, type SpinePreviewHandle } from "@game-editor/renderer-pixi";
import type { Editor } from "@game-editor/editor-core";
import { uniqueSelectOptions } from "../panels/fields/unique-select-options";

export function SpineAssetPreview({
  asset,
  editor,
}: {
  asset: AssetRecord;
  editor: Editor;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<SpinePreviewHandle | undefined>(undefined);
  const skins =
    asset.metadata.kind === "spine"
      ? uniqueSelectOptions(asset.metadata.skins)
      : [];
  const animations =
    asset.metadata.kind === "spine"
      ? uniqueSelectOptions(asset.metadata.animations)
      : [];
  const [skin, setSkin] = useState(skins[0]);
  const [animation, setAnimation] = useState(animations[0]);
  const [loadError, setLoadError] = useState<string | undefined>();
  const skinRef = useRef(skin);
  const animationRef = useRef(animation);
  skinRef.current = skin;
  animationRef.current = animation;

  useEffect(() => {
    setSkin(skins[0]);
    setAnimation(animations[0]);
    setLoadError(undefined);
  }, [asset.id, skins[0], animations[0]]);

  useEffect(() => {
    const host = hostRef.current;
    const urls = editor.assets.resolveSpineUrls(asset.id);
    if (!host) {
      return;
    }
    if (!urls) {
      setLoadError("Unable to resolve Spine atlas or skeleton URLs.");
      return;
    }
    let cancelled = false;
    void mountSpinePreview({
      parent: host,
      urls,
      skin: skinRef.current,
      animation: animationRef.current,
      playing: animations.length > 0,
    }).then(
      (handle) => {
        if (cancelled) {
          handle.destroy();
          return;
        }
        handleRef.current = handle;
        handle.setSkin(skinRef.current);
        handle.setAnimation(animationRef.current);
      },
      (error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      },
    );
    return () => {
      cancelled = true;
      handleRef.current?.destroy();
      handleRef.current = undefined;
      host.replaceChildren();
    };
  }, [asset.id, editor, animations.length]);

  useEffect(() => {
    handleRef.current?.setSkin(skin);
  }, [skin]);

  useEffect(() => {
    handleRef.current?.setAnimation(animation);
  }, [animation]);

  return (
    <div className="asset-live-preview">
      <div className="asset-live-preview-label">Spine</div>
      {loadError ? (
        <p className="panel-error">{loadError}</p>
      ) : (
        <>
          <div ref={hostRef} className="asset-live-preview-stage" />
          {skins.length > 0 ? (
            <label className="asset-live-preview-anim">
              Skin
              <select
                value={skin ?? ""}
                onChange={(event) => {
                  const next = event.target.value;
                  setSkin(next.length > 0 ? next : undefined);
                }}
              >
                {skins.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {animations.length > 0 ? (
            <label className="asset-live-preview-anim">
              Animation
              <select
                value={animation ?? ""}
                onChange={(event) => {
                  const next = event.target.value;
                  setAnimation(next.length > 0 ? next : undefined);
                }}
              >
                {animations.map((name) => (
                  <option key={name} value={name}>
                    {name}
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
