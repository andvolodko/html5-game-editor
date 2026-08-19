import { z } from "zod";
import { NODE_POINTER_EVENT_MODES } from "../node-pointer.js";

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

export const prefabPointerEventModeOverrideSchema = z.object({
  kind: z.literal("pointerEventMode"),
  sourceNodeId: z.string().min(1),
  value: z.enum(NODE_POINTER_EVENT_MODES),
});

export const prefabCursorOverrideSchema = z.object({
  kind: z.literal("cursor"),
  sourceNodeId: z.string().min(1),
  value: z.string(),
});

export const prefabPointerChildrenOverrideSchema = z.object({
  kind: z.literal("pointerChildren"),
  sourceNodeId: z.string().min(1),
  value: z.boolean(),
});

export const prefabOverrideSchema = z.discriminatedUnion("kind", [
  prefabPropertyOverrideSchema,
  prefabNameOverrideSchema,
  prefabLayerOverrideSchema,
  prefabVisibleOverrideSchema,
  prefabAlphaOverrideSchema,
  prefabPointerEventModeOverrideSchema,
  prefabCursorOverrideSchema,
  prefabPointerChildrenOverrideSchema,
]);

export const prefabInstanceLinkSchema = z.object({
  prefabAssetId: z.string().min(1),
  instanceId: z.string().min(1),
  sourceNodeId: z.string().min(1),
  componentSources: z.record(z.string().min(1), z.string().min(1)),
  isRoot: z.boolean().optional(),
  overrides: z.array(prefabOverrideSchema).optional(),
});
