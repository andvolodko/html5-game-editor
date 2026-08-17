import { useState } from "react";
import {
  computeTileSetGrid,
  rasterAssetDisplaySize,
  tileIdAtPixel,
  tileRegion,
  type AssetRecord,
  type TileDefinition,
  type TileSetData,
} from "@game-editor/assets";
import type { Editor } from "@game-editor/editor-core";
import { tileSetDocumentFromAsset } from "@game-editor/editor-core";
import { useEditorState } from "../hooks/useEditorState";
import {
  AssetSelectField,
  NumberField,
  StringField,
} from "../panels/fields/inspector-fields";
import { TileSetTileEditor } from "./TileSetTileEditor";

export function TileSetAssetPreview({
  asset,
  editor,
}: {
  asset: AssetRecord;
  editor: Editor;
}) {
  const revision = useEditorState((ed) => ed.assets.getRevision() ?? "");
  void revision;
  const tileset = tileSetDocumentFromAsset(editor, asset.id);
  const [selectedTileId, setSelectedTileId] = useState(0);
  const [pickingFrameIndex, setPickingFrameIndex] = useState<
    number | undefined
  >(undefined);
  if (!tileset) {
    return <p className="panel-hint">TileSet metadata is missing.</p>;
  }
  const image = editor.assets.get(tileset.imageAssetId);
  const imageSize = image ? rasterAssetDisplaySize(image) : undefined;
  const imageUrl = editor.assets.getContentUrl(tileset.imageAssetId);

  const persist = (patch: Partial<TileSetData>) => {
    const imageWidth =
      imageSize?.width ??
      (patch.tileWidth ?? tileset.tileWidth) * Math.max(1, tileset.columns);
    const imageHeight =
      imageSize?.height ??
      (patch.tileHeight ?? tileset.tileHeight) * Math.max(1, tileset.rows);
    const nextBase = { ...tileset, ...patch };
    const grid = computeTileSetGrid({
      imageWidth,
      imageHeight,
      tileWidth: nextBase.tileWidth,
      tileHeight: nextBase.tileHeight,
      margin: nextBase.margin,
      spacing: nextBase.spacing,
    });
    const next: TileSetData = {
      ...nextBase,
      columns: grid.columns,
      rows: grid.rows,
    };
    void editor.saveTileSetDocument(asset.id, next).catch((error: unknown) => {
      editor.console.log({
        level: "error",
        category: "assets",
        message:
          error instanceof Error ? error.message : "Save TileSet failed",
      });
    });
  };

  const persistTiles = (tiles: Record<string, TileDefinition> | undefined) => {
    persist({ tiles });
  };

  return (
    <div className="tileset-editor">
      <div className="inspector-grid tileset-editor-fields">
        <StringField
          label="Name"
          value={tileset.name}
          onCommit={(name) => persist({ name: name.trim() || tileset.name })}
        />
        <AssetSelectField
          label="Source Texture"
          kind="texture"
          value={tileset.imageAssetId}
          onCommit={(imageAssetId) => {
            if (!imageAssetId) {
              return;
            }
            persist({ imageAssetId });
          }}
        />
        <NumberField
          label="Tile Width"
          integer
          value={tileset.tileWidth}
          onCommit={(tileWidth) => persist({ tileWidth: Math.max(1, tileWidth) })}
        />
        <NumberField
          label="Tile Height"
          integer
          value={tileset.tileHeight}
          onCommit={(tileHeight) =>
            persist({ tileHeight: Math.max(1, tileHeight) })
          }
        />
        <NumberField
          label="Margin"
          integer
          value={tileset.margin}
          onCommit={(margin) => persist({ margin: Math.max(0, margin) })}
        />
        <NumberField
          label="Spacing"
          integer
          value={tileset.spacing}
          onCommit={(spacing) => persist({ spacing: Math.max(0, spacing) })}
        />
        <label>
          Columns
          <input readOnly value={tileset.columns} />
        </label>
        <label>
          Rows
          <input readOnly value={tileset.rows} />
        </label>
      </div>
      {imageUrl && imageSize ? (
        <>
          <TileSetGridPreview
            imageUrl={imageUrl}
            imageWidth={imageSize.width}
            imageHeight={imageSize.height}
            tileset={tileset}
            selectedTileId={selectedTileId}
            picking={pickingFrameIndex !== undefined}
            onSelectTile={(tileId) => {
              if (pickingFrameIndex !== undefined) {
                const definition = tileset.tiles?.[String(selectedTileId)] ?? {};
                const frames = [...(definition.animation?.frames ?? [])];
                if (frames[pickingFrameIndex]) {
                  frames[pickingFrameIndex] = {
                    ...frames[pickingFrameIndex],
                    tileId,
                  };
                  persistTiles({
                    ...tileset.tiles,
                    [String(selectedTileId)]: {
                      ...definition,
                      animation: {
                        ...definition.animation,
                        frames,
                      },
                    },
                  });
                }
                setPickingFrameIndex(undefined);
                return;
              }
              setSelectedTileId(tileId);
            }}
          />
          <TileSetTileEditor
            tileset={tileset}
            tilesetAssetId={asset.id}
            tileId={selectedTileId}
            imageUrl={imageUrl}
            imageWidth={imageSize.width}
            imageHeight={imageSize.height}
            pickingFrameIndex={pickingFrameIndex}
            onPickFrame={setPickingFrameIndex}
            onChange={persistTiles}
          />
        </>
      ) : (
        <p className="panel-hint">Source texture is missing.</p>
      )}
    </div>
  );
}

function TileSetGridPreview({
  imageUrl,
  imageWidth,
  imageHeight,
  tileset,
  selectedTileId,
  picking,
  onSelectTile,
}: {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  tileset: TileSetData;
  selectedTileId: number;
  picking: boolean;
  onSelectTile: (tileId: number) => void;
}) {
  const lines: string[] = [];
  const strideX = tileset.tileWidth + tileset.spacing;
  const strideY = tileset.tileHeight + tileset.spacing;
  for (let column = 0; column <= tileset.columns; column += 1) {
    const x =
      tileset.margin +
      column * strideX -
      (column === tileset.columns ? tileset.spacing : 0);
    lines.push(`M ${String(x)} 0 V ${String(imageHeight)}`);
  }
  for (let row = 0; row <= tileset.rows; row += 1) {
    const y =
      tileset.margin +
      row * strideY -
      (row === tileset.rows ? tileset.spacing : 0);
    lines.push(`M 0 ${String(y)} H ${String(imageWidth)}`);
  }
  const selected = tileRegion({
    tileId: selectedTileId,
    columns: tileset.columns,
    rows: tileset.rows,
    tileWidth: tileset.tileWidth,
    tileHeight: tileset.tileHeight,
    margin: tileset.margin,
    spacing: tileset.spacing,
  });
  return (
    <div className="tileset-preview-frame">
      <div
        className={
          picking ? "tileset-preview-stage picking" : "tileset-preview-stage"
        }
        onClick={(event) => {
          const stage = event.currentTarget;
          const rect = stage.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) {
            return;
          }
          const x = ((event.clientX - rect.left) * imageWidth) / rect.width;
          const y = ((event.clientY - rect.top) * imageHeight) / rect.height;
          const tileId = tileIdAtPixel({
            x,
            y,
            columns: tileset.columns,
            rows: tileset.rows,
            tileWidth: tileset.tileWidth,
            tileHeight: tileset.tileHeight,
            margin: tileset.margin,
            spacing: tileset.spacing,
          });
          if (tileId !== undefined) {
            onSelectTile(tileId);
          }
        }}
      >
        <img
          className="tileset-preview-image"
          src={imageUrl}
          alt=""
          width={imageWidth}
          height={imageHeight}
        />
        <svg
          className="tileset-preview-grid"
          viewBox={`0 0 ${String(imageWidth)} ${String(imageHeight)}`}
          aria-hidden
        >
          <path d={lines.join(" ")} />
          {selected ? (
            <rect
              className="tileset-preview-selection"
              x={selected.x}
              y={selected.y}
              width={selected.width}
              height={selected.height}
            />
          ) : null}
        </svg>
      </div>
    </div>
  );
}
