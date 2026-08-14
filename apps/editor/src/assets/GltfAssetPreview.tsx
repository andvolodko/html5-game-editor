import { useEffect, useRef, useState } from "react";
import type { AssetRecord } from "@game-editor/assets";
import { mountGltfPreview, type GltfPreviewHandle } from "@game-editor/renderer-three";
import type { Editor } from "@game-editor/editor-core";
import { uniqueSelectOptions } from "../panels/fields/unique-select-options";

export function GltfAssetPreview({
  asset,
  editor,
}: {
  asset: AssetRecord;
  editor: Editor;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<GltfPreviewHandle | undefined>(undefined);
  const animations =
    asset.metadata.kind === "gltf"
      ? uniqueSelectOptions(asset.metadata.animations)
      : [];
  const [animation, setAnimation] = useState(animations[0]);
  const [loadError, setLoadError] = useState<string | undefined>();
  const animationRef = useRef(animation);
  animationRef.current = animation;

  useEffect(() => {
    setAnimation(animations[0]);
    setLoadError(undefined);
  }, [asset.id, animations[0]]);

  useEffect(() => {
    const host = hostRef.current;
    const urls = editor.assets.resolveGltfUrls(asset.id);
    if (!host) {
      return;
    }
    if (!urls) {
      setLoadError("Unable to resolve glTF URLs.");
      return;
    }
    let cancelled = false;
    void mountGltfPreview({
      parent: host,
      urls,
      animation: animationRef.current,
      playing: animations.length > 0,
    }).then(
      (handle) => {
        if (cancelled) {
          handle.destroy();
          return;
        }
        handleRef.current = handle;
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
    handleRef.current?.setAnimation(animation);
  }, [animation]);

  return (
    <div className="asset-live-preview">
      <div className="asset-live-preview-label">glTF</div>
      {loadError ? (
        <p className="panel-error">{loadError}</p>
      ) : (
        <>
          <div ref={hostRef} className="asset-live-preview-stage" />
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
