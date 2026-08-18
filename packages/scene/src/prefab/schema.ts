import { z } from "zod";
import { sceneNodeSchema } from "../schema.js";
import { PREFAB_SCHEMA_VERSION, type PrefabData } from "./types.js";

export {
  prefabPropertyOverrideSchema,
  prefabNameOverrideSchema,
  prefabLayerOverrideSchema,
  prefabVisibleOverrideSchema,
  prefabAlphaOverrideSchema,
  prefabOverrideSchema,
  prefabInstanceLinkSchema,
} from "./link-schema.js";

export const prefabDataSchema: z.ZodType<PrefabData> = z.object({
  version: z.number().int().positive(),
  id: z.string().min(1),
  name: z.string().min(1),
  root: sceneNodeSchema,
});

export function parsePrefabData(input: unknown): PrefabData {
  return prefabDataSchema.parse(input);
}

export function isCurrentPrefabSchemaVersion(version: number): boolean {
  return version === PREFAB_SCHEMA_VERSION;
}

/** Deterministic JSON for Git-friendly prefab persistence. */
export function serializePrefabData(data: PrefabData): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}
