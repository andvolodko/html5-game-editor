import { z } from "zod";

export const assetTypeSchema = z.enum([
  "texture",
  "spritesheet",
  "model3d",
  "audio",
  "font",
  "spine",
  "environment",
  "scene",
  "prefab",
]);

export const assetRecordSchema = z.object({
  id: z.string().min(1),
  type: assetTypeSchema,
  path: z.string().min(1),
  name: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const assetDatabaseSchema = z.object({
  version: z.number().int().positive(),
  assets: z.array(assetRecordSchema),
});

export type ParsedAssetDatabase = z.infer<typeof assetDatabaseSchema>;

export function parseAssetDatabase(input: unknown): ParsedAssetDatabase {
  return assetDatabaseSchema.parse(input);
}
