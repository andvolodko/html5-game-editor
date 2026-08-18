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

export const prefabVisibleOverrideSchema = z.object({
  kind: z.literal("visible"),
  sourceNodeId: z.string().min(1),
  value: z.boolean(),
});

export const prefabAlphaOverrideSchema = z.object({
  kind: z.literal("alpha"),
  sourceNodeId: z.string().min(1),
  value: z.number().min(0).max(1),
});

export const prefabOverrideSchema = z.discriminatedUnion("kind", [
  prefabPropertyOverrideSchema,
  prefabNameOverrideSchema,
  prefabLayerOverrideSchema,
  prefabVisibleOverrideSchema,
  prefabAlphaOverrideSchema,
]);

export const prefabInstanceLinkSchema = z.object({
  prefabAssetId: z.string().min(1),
  instanceId: z.string().min(1),
  sourceNodeId: z.string().min(1),
  componentSources: z.record(z.string().min(1), z.string().min(1)),
  isRoot: z.boolean().optional(),
  overrides: z.array(prefabOverrideSchema).optional(),
});
