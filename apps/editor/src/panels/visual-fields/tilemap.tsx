import {
  rasterAssetDisplaySize,
  tileCount,
} from "@game-editor/assets";
import type { Editor } from "@game-editor/editor-core";
import type { VisualComponentData } from "@game-editor/scene";
import { TileAtlasThumb } from "../../assets/TileAtlasThumb";
import { useEditorState } from "../../hooks/useEditorState";
import { AssetSelectField, InspectorFieldRow, NumberField } from "../fields/inspector-fields";
import type { VisualCommit } from "./types";

const PALETTE_CELL_SIZE = 32;
const MAX_PALETTE_TILES = 1024;

export function TilemapFields({
  visual,
  commit,
  editor,
}: {
  visual: Extract<VisualComponentData, { type: "Tilemap" }>;
  commit: VisualCommit;
  editor: Editor;
}) {
  const selectedTileId = useEditorState((ed) =>
    ed.tilemapEdit.getSelectedTileId(),
  );
  const tileset = visual.tileSetId
    ? editor.assets.resolveTileSet(visual.tileSetId)
    : undefined;
  const image = tileset ? editor.assets.get(tileset.imageAssetId) : undefined;
  const imageSize = image ? rasterAssetDisplaySize(image) : undefined;
  const imageUrl = tileset
    ? editor.assets.getContentUrl(tileset.imageAssetId)
    : undefined;
  const count = tileset ? tileCount(tileset.columns, tileset.rows) : 0;

  return (
    <>
      <AssetSelectField
        label="Tile Set"
        kind="tileset"
        value={visual.tileSetId}
        onCommit={(tileSetId) => {
          const next = tileSetId
            ? editor.assets.resolveTileSet(tileSetId)
            : undefined;
          commit({
            tileSetId,
            ...(next
              ? { tileWidth: next.tileWidth, tileHeight: next.tileHeight }
              : {}),
          });
        }}
      />
      <InspectorFieldRow>
        <NumberField
          label="Tile Width"
          integer
          value={visual.tileWidth}
          onCommit={(tileWidth) =>
            commit({ tileWidth: Math.max(1, tileWidth) })
          }
        />
        <NumberField
          label="Tile Height"
          integer
          value={visual.tileHeight}
          onCommit={(tileHeight) =>
            commit({ tileHeight: Math.max(1, tileHeight) })
          }
        />
      </InspectorFieldRow>
      {tileset && imageUrl && imageSize && count > 0 ? (
        <div className="tile-palette">
          <div className="tile-palette-label">Tile Palette</div>
          <div className="tile-palette-grid">
            {Array.from(
              { length: Math.min(count, MAX_PALETTE_TILES) },
              (_, tileId) => (
                <TileAtlasThumb
                  key={tileId}
                  tilesetId={visual.tileSetId}
                  tileset={tileset}
                  logicalTileId={tileId}
                  imageUrl={imageUrl}
                  imageWidth={imageSize.width}
                  imageHeight={imageSize.height}
                  size={PALETTE_CELL_SIZE}
                  className="tile-palette-cell"
                  title={`Tile ${String(tileId)}`}
                  selected={tileId === selectedTileId}
                  showPlayIndicator
                  onClick={() => editor.tilemapEdit.setSelectedTileId(tileId)}
                />
              ),
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
