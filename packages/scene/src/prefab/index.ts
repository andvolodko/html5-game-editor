export type {
  PrefabPropertyOverride,
  PrefabNameOverride,
  PrefabLayerOverride,
  PrefabVisibleOverride,
  PrefabOverride,
  PrefabInstanceLink,
  PrefabData,
  PrefabCatalog,
  PrefabResolveWarningCode,
  PrefabResolveWarning,
  PrefabResolveResult,
} from "./types.js";
export { PREFAB_SCHEMA_VERSION, PREFAB_MAX_NESTING_DEPTH } from "./types.js";
export {
  prefabPropertyOverrideSchema,
  prefabNameOverrideSchema,
  prefabLayerOverrideSchema,
  prefabVisibleOverrideSchema,
  prefabOverrideSchema,
  prefabInstanceLinkSchema,
  prefabDataSchema,
  parsePrefabData,
  isCurrentPrefabSchemaVersion,
  serializePrefabData,
} from "./schema.js";
export {
  cloneSerializableNode,
  remintPrefabInstanceIds,
  cloneComponentWithNewId,
  createPrefabInstanceLink,
} from "./clone.js";
export {
  getPrefabLink,
  isPrefabInstanceRoot,
  isInheritedPrefabNode,
  isLocalPrefabChild,
  findPrefabInstanceRoot,
  getPrefabInstanceOverrides,
  sourceComponentIdFor,
  sceneComponentIdForSource,
  collectPrefabInstanceNodes,
  findInstanceNodeBySourceId,
  collectPrefabAssetIdsFromNodes,
} from "./queries.js";
export {
  sortPrefabOverrides,
  findPropertyOverride,
  isPropertyOverridden,
  upsertPrefabOverride,
  removePrefabOverride,
  applyPropertyOverrideToComponent,
  revertPropertyOnComponent,
  computePrefabOverrides,
  applyOverridesToInstance,
  applySourceValueToPrefabNode,
  applyNameOrLayerToPrefabNode,
  findPrefabSourceNode,
} from "./overrides.js";
export {
  instantiatePrefab,
  instantiateFromSource,
} from "./instantiate.js";
export type { InstantiatePrefabOptions, InstantiatePrefabResult } from "./instantiate.js";
export {
  resolvePrefabInstance,
  resolveScenePrefabs,
  instantiatePrefabResolved,
  applyOverridesToPrefabAsset,
  createEmptyPrefabId,
} from "./resolver.js";
export { expandPrefabSourceTree } from "./resolver-expand.js";
export { unpackPrefabInstance } from "./unpack.js";
export { createPrefabFromSubtree } from "./create.js";
export type { CreatePrefabFromSubtreeResult } from "./create.js";
export {
  getValueAtPath,
  setValueAtPath,
  deleteValueAtPath,
  collectChangedPropertyPaths,
  prefabValuesEqual,
  cloneJson,
} from "./property-path.js";
