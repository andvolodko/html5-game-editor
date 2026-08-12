import type { AssetDatabaseData } from "./types.js";
import { serializeAssetDatabase } from "./schema.js";

/**
 * Deterministic content revision for catalogue sync (ETag-style).
 * Changes when any asset record changes.
 */
export function computeAssetDatabaseRevision(data: AssetDatabaseData): string {
  const payload = serializeAssetDatabase(data);
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i += 1) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `a${(hash >>> 0).toString(16)}`;
}
