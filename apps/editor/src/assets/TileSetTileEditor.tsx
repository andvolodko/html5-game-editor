import {
  DEFAULT_TILE_ANIMATION_DURATION_MS,
  type TileAnimationFrame,
  type TileDefinition,
  type TileSetData,
} from "@game-editor/assets";
import { BooleanField, NumberField, StringField } from "../panels/fields/inspector-fields";
import { TileAtlasThumb } from "./TileAtlasThumb";

export function TileSetTileEditor({
  tileset,
  tilesetAssetId,
  tileId,
  imageUrl,
  imageWidth,
  imageHeight,
  pickingFrameIndex,
  onPickFrame,
  onChange,
}: {
  tileset: TileSetData;
  tilesetAssetId: string;
  tileId: number;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  pickingFrameIndex: number | undefined;
  onPickFrame: (index: number | undefined) => void;
  onChange: (tiles: Record<string, TileDefinition> | undefined) => void;
}) {
  const definition = tileset.tiles?.[String(tileId)] ?? {};
  const animation = definition.animation;
  const frames = animation?.frames ?? [];
  const animated = frames.length > 0;

  const commitDefinition = (next: TileDefinition | undefined) => {
    onChange(upsertTileDefinition(tileset.tiles, tileId, next));
  };

  return (
    <div className="tileset-tile-editor inspector-grid">
      <div className="tileset-tile-editor-heading">
        <TileAtlasThumb
          tilesetId={tilesetAssetId}
          tileset={tileset}
          logicalTileId={tileId}
          imageUrl={imageUrl}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          size={32}
          className="tile-palette-cell"
          showPlayIndicator
        />
        Tile {String(tileId)}
      </div>
      <StringField
        label="Name"
        value={definition.name ?? ""}
        onCommit={(name) => {
          const trimmed = name.trim();
          commitDefinition(
            compactTileDefinition({
              ...definition,
              name: trimmed.length > 0 ? trimmed : undefined,
            }),
          );
        }}
      />
      <BooleanField
        label="Animated"
        value={animated}
        onCommit={(enabled) => {
          if (!enabled) {
            commitDefinition(
              compactTileDefinition({ ...definition, animation: undefined }),
            );
            onPickFrame(undefined);
            return;
          }
          commitDefinition({
            ...definition,
            animation: {
              loop: true,
              frames: [
                {
                  tileId,
                  duration: DEFAULT_TILE_ANIMATION_DURATION_MS,
                },
              ],
            },
          });
        }}
      />
      {animated ? (
        <>
          <div className="tileset-animation-frames-label">Frames</div>
          <div className="tileset-animation-frames">
            {frames.map((frame, index) => (
              <AnimationFrameRow
                key={`${String(index)}:${String(frame.tileId)}`}
                tileset={tileset}
                tilesetAssetId={tilesetAssetId}
                imageUrl={imageUrl}
                imageWidth={imageWidth}
                imageHeight={imageHeight}
                frame={frame}
                picking={pickingFrameIndex === index}
                onPick={() =>
                  onPickFrame(pickingFrameIndex === index ? undefined : index)
                }
                onChangeFrame={(next) => {
                  const nextFrames = [...frames];
                  nextFrames[index] = next;
                  commitDefinition({
                    ...definition,
                    animation: { ...animation, frames: nextFrames },
                  });
                }}
                onRemove={() => {
                  const nextFrames = frames.filter((_, i) => i !== index);
                  commitDefinition({
                    ...definition,
                    animation:
                      nextFrames.length > 0
                        ? { ...animation, frames: nextFrames }
                        : undefined,
                  });
                  onPickFrame(undefined);
                }}
                onMove={(delta) => {
                  const target = index + delta;
                  if (target < 0 || target >= frames.length) {
                    return;
                  }
                  const nextFrames = [...frames];
                  const [moved] = nextFrames.splice(index, 1);
                  nextFrames.splice(target, 0, moved!);
                  commitDefinition({
                    ...definition,
                    animation: { ...animation, frames: nextFrames },
                  });
                }}
              />
            ))}
          </div>
          <button
            type="button"
            className="tileset-add-frame"
            onClick={() => {
              const last = frames[frames.length - 1];
              commitDefinition({
                ...definition,
                animation: {
                  ...animation,
                  frames: [
                    ...frames,
                    {
                      tileId: last?.tileId ?? tileId,
                      duration:
                        last?.duration && last.duration > 0
                          ? last.duration
                          : DEFAULT_TILE_ANIMATION_DURATION_MS,
                    },
                  ],
                },
              });
            }}
          >
            Add Frame
          </button>
          <BooleanField
            label="Loop"
            value={animation?.loop !== false}
            onCommit={(loop) => {
              commitDefinition({
                ...definition,
                animation: { ...animation, frames, loop },
              });
            }}
          />
          {pickingFrameIndex !== undefined ? (
            <p className="panel-hint">
              Click a tile in the atlas to set this frame.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function AnimationFrameRow({
  tileset,
  tilesetAssetId,
  imageUrl,
  imageWidth,
  imageHeight,
  frame,
  picking,
  onPick,
  onChangeFrame,
  onRemove,
  onMove,
}: {
  tileset: TileSetData;
  tilesetAssetId: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  frame: TileAnimationFrame;
  picking: boolean;
  onPick: () => void;
  onChangeFrame: (frame: TileAnimationFrame) => void;
  onRemove: () => void;
  onMove: (delta: number) => void;
}) {
  return (
    <div className={picking ? "tileset-frame-row picking" : "tileset-frame-row"}>
      <TileAtlasThumb
        tilesetId={tilesetAssetId}
        tileset={tileset}
        logicalTileId={frame.tileId}
        imageUrl={imageUrl}
        imageWidth={imageWidth}
        imageHeight={imageHeight}
        size={32}
        className="tile-palette-cell"
        title={`Frame tile ${String(frame.tileId)}`}
        animate={false}
        onClick={onPick}
      />
      <NumberField
        label="Tile"
        integer
        value={frame.tileId}
        onCommit={(tileId) =>
          onChangeFrame({ ...frame, tileId: Math.max(0, tileId) })
        }
      />
      <NumberField
        label="Duration ms"
        integer
        value={frame.duration}
        onCommit={(duration) => onChangeFrame({ ...frame, duration })}
      />
      <div className="tileset-frame-row-actions">
        <button type="button" onClick={() => onMove(-1)} aria-label="Move up">
          Up
        </button>
        <button type="button" onClick={() => onMove(1)} aria-label="Move down">
          Down
        </button>
        <button type="button" onClick={onRemove} aria-label="Remove frame">
          Remove
        </button>
      </div>
    </div>
  );
}

function upsertTileDefinition(
  tiles: Record<string, TileDefinition> | undefined,
  tileId: number,
  next: TileDefinition | undefined,
): Record<string, TileDefinition> | undefined {
  const result = { ...tiles };
  const key = String(tileId);
  if (!next) {
    delete result[key];
  } else {
    result[key] = next;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function compactTileDefinition(
  definition: TileDefinition,
): TileDefinition | undefined {
  const next: TileDefinition = {};
  if (definition.name) {
    next.name = definition.name;
  }
  if (definition.tags && definition.tags.length > 0) {
    next.tags = definition.tags;
  }
  if (definition.animation && definition.animation.frames.length > 0) {
    next.animation = definition.animation;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}
