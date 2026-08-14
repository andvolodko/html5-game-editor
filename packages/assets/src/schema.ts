import { z } from "zod";
import { ASSET_SCHEMA_VERSION, type AssetDatabaseData, type AssetRecord } from "./types.js";

export const assetTypeSchema = z.enum(["texture", "spine", "audio", "gltf", "aseprite"]);

export const textureAssetMetadataSchema = z.object({
  kind: z.literal("texture"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  mimeType: z.string().min(1),
});

export const spineAssetMetadataSchema = z.object({
  kind: z.literal("spine"),
  skeletonFormat: z.enum(["json", "skel"]),
  atlasPath: z.string().min(1),
  pagePaths: z.array(z.string().min(1)).min(1),
  skins: z.array(z.string().min(1)),
  animations: z.array(z.string().min(1)),
});

export const audioAssetMetadataSchema = z.object({
  kind: z.literal("audio"),
  mimeType: z.string().min(1),
});

export const gltfAssetMetadataSchema = z.object({
  kind: z.literal("gltf"),
  mimeType: z.string().min(1),
  format: z.enum(["glb", "gltf"]),
  /** Absent on older manifests — treat as empty. */
  animations: z.array(z.string().min(1)).default([]),
  bufferPaths: z.array(z.string().min(1)).optional(),
  imagePaths: z.array(z.string().min(1)).optional(),
});

export const asepriteTagMetadataSchema = z.object({
  name: z.string().min(1),
  from: z.number().int().nonnegative(),
  to: z.number().int().nonnegative(),
  direction: z.enum(["forward", "reverse", "pingpong"]).optional(),
});

export const asepriteAssetMetadataSchema = z.object({
  kind: z.literal("aseprite"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  frameCount: z.number().int().nonnegative(),
  tags: z.array(asepriteTagMetadataSchema),
  frameDurations: z.array(z.number().positive()),
  sheetPath: z.string().min(1),
  dataPath: z.string().min(1),
  compileRevision: z.string().min(1).optional(),
  compileError: z.string().min(1).optional(),
});

export const assetMetadataSchema = z.discriminatedUnion("kind", [
  textureAssetMetadataSchema,
  spineAssetMetadataSchema,
  audioAssetMetadataSchema,
  gltfAssetMetadataSchema,
  asepriteAssetMetadataSchema,
]);

const assetRecordObjectSchema = z.object({
  id: z.string().min(1),
  type: assetTypeSchema,
  name: z.string().min(1),
  path: z.string().min(1),
  metadata: assetMetadataSchema,
});

/** Enforces `type === metadata.kind`. */
export const assetRecordSchema: z.ZodType<AssetRecord> = assetRecordObjectSchema.superRefine(
  (value, ctx) => {
    if (value.type !== value.metadata.kind) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `AssetRecord.type (${value.type}) must equal metadata.kind (${value.metadata.kind})`,
        path: ["type"],
      });
    }
  },
) as z.ZodType<AssetRecord>;

export const assetDatabaseSchema: z.ZodType<AssetDatabaseData> = z.object({
  version: z.number().int().positive(),
  assets: z.array(assetRecordSchema),
});

export function parseAssetDatabase(input: unknown): AssetDatabaseData {
  return assetDatabaseSchema.parse(input);
}

export function parseAssetRecord(input: unknown): AssetRecord {
  return assetRecordSchema.parse(input);
}

export function isCurrentAssetSchemaVersion(version: number): boolean {
  return version === ASSET_SCHEMA_VERSION;
}

/** Deterministic JSON for Git-friendly persistence (assets sorted by id). */
export function serializeAssetDatabase(data: AssetDatabaseData): string {
  const normalized: AssetDatabaseData = {
    version: data.version,
    assets: [...data.assets].sort((a, b) => a.id.localeCompare(b.id)),
  };
  return `${JSON.stringify(normalized, null, 2)}\n`;
}
