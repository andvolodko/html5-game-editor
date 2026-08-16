export type {
  AssetType,
  TextureAssetMetadata,
  SpineAssetMetadata,
  AudioAssetMetadata,
  GltfAssetMetadata,
  AsepriteAssetMetadata,
  AsepriteTagMetadata,
  AsepriteTagDirection,
  BitmapFontAssetMetadata,
  WebFontAssetMetadata,
  PrefabAssetMetadata,
  AssetMetadata,
  AssetRecord,
  AssetDatabaseData,
} from "./types.js";
export { ASSET_SCHEMA_VERSION } from "./types.js";
export {
  assetTypeSchema,
  textureAssetMetadataSchema,
  spineAssetMetadataSchema,
  audioAssetMetadataSchema,
  gltfAssetMetadataSchema,
  asepriteAssetMetadataSchema,
  asepriteTagMetadataSchema,
  bitmapFontAssetMetadataSchema,
  webFontAssetMetadataSchema,
  prefabAssetMetadataSchema,
  assetMetadataSchema,
  assetRecordSchema,
  assetDatabaseSchema,
  parseAssetDatabase,
  parseAssetRecord,
  isCurrentAssetSchemaVersion,
  serializeAssetDatabase,
} from "./schema.js";
export {
  createEmptyAssetDatabase,
  createTextureAssetRecord,
  createSpineAssetRecord,
  createAudioAssetRecord,
  createGltfAssetRecord,
  createAsepriteAssetRecord,
  createBitmapFontAssetRecord,
  createWebFontAssetRecord,
  createPrefabAssetRecord,
  normalizeProjectRelativePath,
  humanizeAssetNodeName,
} from "./factories.js";
export { AssetDatabase, assetRecordsEquivalent } from "./asset-database.js";
export { parseDeletableAssetFolderPath } from "./deletable-asset-folder-path.js";
export type {
  AssetResolver,
  SpineAssetUrls,
  GltfAssetUrls,
  AsepriteAssetUrls,
  BitmapFontAssetUrls,
  WebFontAssetUrls,
} from "./asset-resolver.js";
export { createAssetResolver } from "./asset-resolver.js";
export type { StaticAssetResolverOptions } from "./static-asset-resolver.js";
export { createStaticAssetResolver } from "./static-asset-resolver.js";
export { computeAssetDatabaseRevision } from "./revision.js";
export { rasterAssetDisplaySize } from "./raster-display-size.js";
export {
  TEXTURE_FILE_EXTENSIONS,
  getFileBasename,
  getFileStem,
  getFileExtension,
  isSupportedTextureExtension,
  mimeTypeForTextureFileName,
  isSupportedTextureFile,
  textureFormatFromMimeType,
} from "./texture-extensions.js";
export type { TextureFileExtension } from "./texture-extensions.js";
export {
  AUDIO_FILE_EXTENSIONS,
  isSupportedAudioExtension,
  mimeTypeForAudioFileName,
  isSupportedAudioFile,
} from "./audio-extensions.js";
export type { AudioFileExtension } from "./audio-extensions.js";
export {
  GLTF_FILE_EXTENSIONS,
  isSupportedGltfExtension,
  isSupportedGlbExtension,
  isSupportedGltfJsonExtension,
  mimeTypeForGltfFileName,
  gltfFormatFromFileName,
  isSupportedGltfFile,
  collectGltfExternalUris,
  parseGltfJsonBytes,
  parseGlbJson,
  extractGltfAnimationNames,
  extractGltfAnimationNamesFromBytes,
  isAllowedGltfPartName,
  ownedGltfPaths,
  resolveGltfPartRelativePath,
  mimeTypeForGltfPart,
} from "./gltf-extensions.js";
export type { GltfFileExtension } from "./gltf-extensions.js";
export {
  SPINE_ATLAS_EXTENSION,
  SPINE_JSON_EXTENSION,
  SPINE_SKEL_EXTENSION,
  isSpineAtlasFile,
  isSpineSkeletonExtension,
  isSpineImportFile,
  isSpineSkeletonJson,
  parseSpineSkeletonJsonBytes,
  parseSpineSkeletonMeta,
  parseAtlasPageNames,
  isAllowedSpinePartName,
  ownedAssetPaths,
  relocateOwnedAssetPaths,
  spineBundleFolder,
  ownedBundleFolder,
  resolveSpinePartRelativePath,
  mimeTypeForSpinePart,
  mimeTypeForSpineSkeleton,
} from "./spine-extensions.js";
export type { SpineSkeletonMeta } from "./spine-extensions.js";
export {
  ASEPRITE_FILE_EXTENSIONS,
  GENERATED_ASSETS_ROOT,
  isSupportedAsepriteExtension,
  isSupportedAsepriteFile,
  generatedAsepriteOutputPaths,
  derivedAsepritePaths,
  withAsepriteSourcePath,
  isAsepriteAnimated,
  firstAsepriteAnimation,
  isAllowedAsepritePartName,
  resolveAsepritePartRelativePath,
  mimeTypeForAsepritePart,
  asepriteCompileRevision,
} from "./aseprite-extensions.js";
export type { AsepriteFileExtension } from "./aseprite-extensions.js";
export {
  BITMAP_FONT_XML_EXTENSION,
  BITMAP_FONT_FNT_EXTENSION,
  isBitmapFontDescriptorExtension,
  isBitmapFontImportFile,
  isAllowedBitmapFontPartName,
  parseBitmapFontDescriptor,
  resolveBitmapFontPartRelativePath,
  mimeTypeForBitmapFontDescriptor,
  mimeTypeForBitmapFontPart,
} from "./bitmap-font-extensions.js";
export type { BitmapFontDescriptorMeta } from "./bitmap-font-extensions.js";
export {
  WEBFONT_FILE_EXTENSIONS,
  isSupportedWebFontExtension,
  webFontFormatFromFileName,
  mimeTypeForWebFontFileName,
  fontFamilyFromWebFontFileName,
  isSupportedWebFontFile,
} from "./webfont-extensions.js";
export type {
  WebFontFileExtension,
  WebFontFormat,
} from "./webfont-extensions.js";
export {
  ASEPRITE_DEFAULT_FRAME_DURATION_MS,
  isAsepriteCliJson,
  parseAsepriteCliJsonBytes,
  listAsepriteCliFrames,
  normalizeAsepriteTagDirection,
  asepriteFrameName,
  asepriteFrameNamespace,
  normalizeAsepriteMetadata,
  asepriteCliJsonToPixiSpritesheet,
} from "./aseprite-json.js";
export type {
  AsepriteCliJson,
  AsepriteCliFrame,
  AsepriteCliTag,
  PixiSpritesheetJson,
} from "./aseprite-json.js";
