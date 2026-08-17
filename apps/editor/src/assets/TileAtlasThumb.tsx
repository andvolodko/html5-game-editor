import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import {
  sharedTileAnimationClock,
  tileAnimationClockKey,
  tileHasPlayableAnimation,
  tileRegion,
  type TileRegion,
  type TileSetResolved,
} from "@game-editor/assets";

export function atlasThumbStyle(
  imageUrl: string,
  imageWidth: number,
  imageHeight: number,
  region: TileRegion,
  size: number,
): CSSProperties {
  return {
    width: size,
    height: size,
    backgroundImage: `url(${imageUrl})`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: `${(-region.x * size) / region.width}px ${(-region.y * size) / region.height}px`,
    backgroundSize: `${(imageWidth * size) / region.width}px ${(imageHeight * size) / region.height}px`,
  };
}

export function TileAtlasThumb({
  tilesetId,
  tileset,
  logicalTileId,
  imageUrl,
  imageWidth,
  imageHeight,
  size,
  className,
  title,
  selected,
  showPlayIndicator,
  onClick,
  animate = true,
}: {
  tilesetId?: string;
  tileset: Pick<
    TileSetResolved,
    | "columns"
    | "rows"
    | "tileWidth"
    | "tileHeight"
    | "margin"
    | "spacing"
    | "tiles"
  >;
  logicalTileId: number;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  size: number;
  className?: string;
  title?: string;
  selected?: boolean;
  showPlayIndicator?: boolean;
  animate?: boolean;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const animated = tileHasPlayableAnimation(tileset, logicalTileId);
  const clock = sharedTileAnimationClock();
  const frameId =
    animate && tilesetId
      ? clock.currentFrame(tilesetId, tileset, logicalTileId)
      : logicalTileId;
  const region = tileRegion({
    tileId: frameId,
    columns: tileset.columns,
    rows: tileset.rows,
    tileWidth: tileset.tileWidth,
    tileHeight: tileset.tileHeight,
    margin: tileset.margin,
    spacing: tileset.spacing,
  });

  useEffect(() => {
    if (!tilesetId || !animated || !animate) {
      return;
    }
    const key = tileAnimationClockKey(tilesetId, logicalTileId);
    clock.setTileset(tilesetId, tileset);
    return clock.subscribe((changed) => {
      if (!changed.has(key)) {
        return;
      }
      const el = ref.current;
      if (!el) {
        return;
      }
      const nextFrame = clock.currentFrame(tilesetId, tileset, logicalTileId);
      const nextRegion = tileRegion({
        tileId: nextFrame,
        columns: tileset.columns,
        rows: tileset.rows,
        tileWidth: tileset.tileWidth,
        tileHeight: tileset.tileHeight,
        margin: tileset.margin,
        spacing: tileset.spacing,
      });
      if (!nextRegion) {
        return;
      }
      el.style.backgroundPosition = `${(-nextRegion.x * size) / nextRegion.width}px ${(-nextRegion.y * size) / nextRegion.height}px`;
    });
  }, [animate, animated, clock, logicalTileId, size, tileset, tilesetId]);

  if (!region) {
    return null;
  }
  return (
    <button
      ref={ref}
      type="button"
      className={[
        className,
        selected ? "selected" : undefined,
        showPlayIndicator && animated ? "animated" : undefined,
      ]
        .filter(Boolean)
        .join(" ")}
      title={title}
      aria-pressed={selected}
      onClick={onClick}
      style={atlasThumbStyle(imageUrl, imageWidth, imageHeight, region, size)}
    />
  );
}
