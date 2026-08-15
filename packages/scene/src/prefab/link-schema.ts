import { z } from "zod";

export const prefabPropertyOverrideSchema = z.object({
  kind: z.literal("property"),
  sourceNodeId: z.string().min(1),
  componentId: z.string().min(1),
  propertyPath: z.string().min(1),
  value: z.unknown(),
});

export const prefabNameOverrideSchema = z.object({
  kind: z.literal("name"),
  sourceNodeId: z.string().min(1),
  value: z.string().min(1),
});

export const prefabLayerOverrideSchema = z.object({
  kind: z.literal("layer"),
  sourceNodeId: z.string().min(1),
  value: z.enum(["background", "foreground"]),
});

export const prefabOverrideSchema = z.discriminatedUnion("kind", [
  prefabPropertyOverrideSchema,
  prefabNameOverrideSchema,
  prefabLayerOverrideSchema,
]);

export const prefabInstanceLinkSchema = z.object({
  prefabAssetId: z.string().min(1),
  instanceId: z.string().min(1),
  sourceNodeId: z.string().min(1),
  componentSources: z.record(z.string().min(1), z.string().min(1)),
  isRoot: z.boolean().optional(),
  overrides: z.array(prefabOverrideSchema).optional(),
});
