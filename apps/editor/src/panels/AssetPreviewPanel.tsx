import { resolveAssetBrowserPreviewUrl } from "@game-editor/editor-core";
import { useEditor } from "../editor-context";
import { useEditorState } from "../hooks/useEditorState";
import { AsepriteAssetPreview } from "../assets/AsepriteAssetPreview";
import { AudioAssetPreview } from "../assets/AudioAssetPreview";
import { GltfAssetPreview } from "../assets/GltfAssetPreview";
import { SpineAssetPreview } from "../assets/SpineAssetPreview";
import { useAssetPreviewSelection } from "../assets/asset-preview-selection";

export function AssetPreviewPanel() {
  const editor = useEditor();
  const { selectedAssetId } = useAssetPreviewSelection();
  const assets = useEditorState((ed) => ed.assets.getAll());
  const asset = selectedAssetId
    ? assets.find((entry) => entry.id === selectedAssetId)
    : undefined;

  if (!asset) {
    return (
      <div className="panel asset-preview-panel">
        <p className="panel-empty">Select an asset in Assets</p>
      </div>
    );
  }

  if (asset.type === "aseprite") {
    return (
      <div className="panel asset-preview-panel">
        <div className="asset-preview-heading">{asset.name}</div>
        <AsepriteAssetPreview key={asset.id} asset={asset} editor={editor} />
      </div>
    );
  }

  if (asset.type === "spine") {
    return (
      <div className="panel asset-preview-panel">
        <div className="asset-preview-heading">{asset.name}</div>
        <SpineAssetPreview key={asset.id} asset={asset} editor={editor} />
      </div>
    );
  }

  if (asset.type === "audio") {
    return (
      <div className="panel asset-preview-panel">
        <div className="asset-preview-heading">{asset.name}</div>
        <AudioAssetPreview key={asset.id} asset={asset} editor={editor} />
      </div>
    );
  }

  if (asset.type === "gltf") {
    return (
      <div className="panel asset-preview-panel">
        <div className="asset-preview-heading">{asset.name}</div>
        <GltfAssetPreview key={asset.id} asset={asset} editor={editor} />
      </div>
    );
  }

  const previewUrl = resolveAssetBrowserPreviewUrl(asset, {
    contentUrl: (assetId) => editor.assets.getContentUrl(assetId),
    spinePartUrl: (assetId, pageBasename) =>
      editor.assets.resolveSpinePartUrl(assetId, pageBasename),
    asepritePartUrl: (assetId, partBasename) =>
      editor.assets.resolveAsepritePartUrl(assetId, partBasename),
  });

  return (
    <div className="panel asset-preview-panel">
      <div className="asset-preview-heading">{asset.name}</div>
      <div className="asset-preview-kind">{asset.type}</div>
      {previewUrl ? (
        <img className="asset-preview-image" src={previewUrl} alt="" />
      ) : (
        <p className="panel-hint">No raster preview for this asset type.</p>
      )}
    </div>
  );
}
