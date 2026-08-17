import {
  computeTileSetGrid,
  createTileSetAssetRecord,
  DEFAULT_TILESET_TILE_SIZE,
  rasterAssetDisplaySize,
  TILESET_FILE_SUFFIX,
  tileSetDataFromRecord,
  tileSetMetadataFromData,
  type TileSetData,
} from "@game-editor/assets";
import { createId } from "@game-editor/shared";
import type { Editor } from "./editor.js";

export async function createTileSetFromTexture(
  editor: Editor,
  imageAssetId: string,
): Promise<string> {
  const image = editor.assets.get(imageAssetId);
  if (!image || image.type !== "texture") {
    throw new Error("Create TileSet requires a texture asset");
  }
  const size = rasterAssetDisplaySize(image);
  const tileWidth = DEFAULT_TILESET_TILE_SIZE;
  const tileHeight = DEFAULT_TILESET_TILE_SIZE;
  const grid = computeTileSetGrid({
    imageWidth: size?.width ?? tileWidth,
    imageHeight: size?.height ?? tileHeight,
    tileWidth,
    tileHeight,
    margin: 0,
    spacing: 0,
  });
  const api = editor.getTileSetApi();
  if (!api) {
    const tilesetId = createId("tileset");
    const destination = tilesetPathBesideImage(image.path, image.name);
    const record = createTileSetAssetRecord({
      name: `${image.name} TileSet`,
      path: destination,
      tilesetId,
      imageAssetId,
      tileWidth,
      tileHeight,
      columns: grid.columns,
      rows: grid.rows,
    });
    editor.assets.getDatabase().add(record);
    editor.assets.notifyChanged();
    return record.id;
  }
  const created = await api.createTileSet({
    name: `${image.name} TileSet`,
    imageAssetId,
    tileWidth,
    tileHeight,
    margin: 0,
    spacing: 0,
    destination: tilesetPathBesideImage(image.path, image.name),
  });
  await editor.assets.refresh({ force: true });
  return created.asset.id;
}

export async function saveTileSetDocument(
  editor: Editor,
  assetId: string,
  tileset: TileSetData,
): Promise<TileSetData> {
  const api = editor.getTileSetApi();
  if (!api) {
    const record = editor.assets.get(assetId);
    if (!record || record.metadata.kind !== "tileset") {
      throw new Error(`TileSet asset not found: ${assetId}`);
    }
    editor.assets.getDatabase().update({
      ...record,
      name: tileset.name,
      metadata: tileSetMetadataFromData(tileset),
    });
    editor.assets.notifyChanged();
    return tileset;
  }
  const saved = await api.saveTileSet(assetId, tileset);
  await editor.assets.refresh({ force: true });
  return saved;
}

export function tileSetDocumentFromAsset(
  editor: Editor,
  assetId: string,
): TileSetData | undefined {
  const record = editor.assets.get(assetId);
  if (!record || record.metadata.kind !== "tileset") {
    return undefined;
  }
  return tileSetDataFromRecord(record.name, record.metadata);
}

function tilesetPathBesideImage(imagePath: string, imageName: string): string {
  const slash = imagePath.lastIndexOf("/");
  const folder = slash > 0 ? imagePath.slice(0, slash) : "assets";
  const stem = imageName.replace(/\.[^.]+$/, "") || "TileSet";
  return `${folder}/${stem}${TILESET_FILE_SUFFIX}`;
}
