import { createPrefabAssetRecord } from "@game-editor/assets";
import {
  applyOverridesToPrefabAsset,
  cloneJson,
  cloneSerializableNode,
  createEmptyScene,
  createPrefabFromSubtree,
  findNodeById,
  flattenSubtree,
  getSceneRendererKind,
  getTransform2D,
  getTransform3D,
  isPrefabInstanceRoot,
  PREFAB_SCHEMA_VERSION,
  resolveScenePrefabs,
  SCENE_SCHEMA_VERSION,
  type PrefabData,
  type SceneData,
  type SceneNodeData,
  type Vec2,
  type Vec3,
} from "@game-editor/scene";
import { DomainError } from "@game-editor/core";
import type { Editor } from "./editor.js";
import { ConvertSubtreeToPrefabInstanceCommand } from "./commands/convert-subtree-to-prefab-instance-command.js";
import { InstantiatePrefabCommand } from "./commands/instantiate-prefab-command.js";
import { RefreshPrefabInstancesCommand } from "./commands/refresh-prefab-instances-command.js";
import { RevertPrefabOverridesCommand } from "./commands/revert-prefab-overrides-command.js";
import { UnpackPrefabCommand } from "./commands/unpack-prefab-command.js";

export async function instantiatePrefabFromAsset(
  editor: Editor,
  assetId: string,
  options?: { position2D?: Vec2; position3D?: Vec3; parentId?: string; index?: number },
): Promise<string> {
  const prefab = await editor.prefabs.loadPrefabRecord(editor.assets, assetId);
  if (!prefab) {
    throw new DomainError("MISSING_PREFAB", `Prefab asset ${assetId} could not be loaded`);
  }
  const command = new InstantiatePrefabCommand(editor.document, editor.selection, {
    prefab,
    prefabAssetId: assetId,
    parentId: options?.parentId,
    index: options?.index,
    position2D: options?.position2D,
    position3D: options?.position3D,
    catalog: editor.prefabs.getCatalog(),
  });
  editor.execute(command);
  return command.createdNodeId;
}

export async function createPrefabFromSelectedNode(
  editor: Editor,
  nodeId: string,
): Promise<string> {
  const node = findNodeById(editor.getScene(), nodeId);
  if (!node) {
    throw new Error(`createPrefabFromSelectedNode: unknown node ${nodeId}`);
  }
  const { prefab, instance } = createPrefabFromSubtree(node, { name: node.name });
  const api = editor.prefabs.getApi();
  if (!api) {
    const asset = createPrefabAssetRecord({
      name: prefab.name,
      path: `assets/prefabs/${sanitizePrefabFileStem(prefab.name)}.prefab.json`,
      prefabId: prefab.id,
    });
    assignInstancePrefabAssetId(instance, asset.id);
    editor.prefabs.set(asset.id, prefab);
    editor.execute(
      new ConvertSubtreeToPrefabInstanceCommand(
        editor.document,
        editor.selection,
        node.id,
        instance,
      ),
    );
    return asset.id;
  }
  const created = await api.createPrefab({
    name: prefab.name,
    root: prefab.root,
  });
  assignInstancePrefabAssetId(instance, created.asset.id);
  editor.prefabs.set(created.asset.id, created.prefab);
  await editor.assets.refresh({ force: true });
  editor.execute(
    new ConvertSubtreeToPrefabInstanceCommand(
      editor.document,
      editor.selection,
      node.id,
      instance,
    ),
  );
  return created.asset.id;
}

export function unpackPrefabInstance(editor: Editor, nodeId: string): void {
  editor.execute(new UnpackPrefabCommand(editor.document, editor.selection, nodeId));
}

export function revertPrefabOverrides(
  editor: Editor,
  nodeId: string,
  overrideIndex?: number,
): void {
  const node = findNodeById(editor.getScene(), nodeId);
  const assetId = node?.prefab?.prefabAssetId;
  const prefab = assetId ? editor.prefabs.get(assetId) : undefined;
  if (!node || !assetId || !prefab) {
    throw new DomainError("MISSING_PREFAB", "Cannot revert overrides without the source prefab");
  }
  editor.execute(
    new RevertPrefabOverridesCommand(
      editor.document,
      editor.selection,
      nodeId,
      prefab,
      editor.prefabs.getCatalog(),
      overrideIndex === undefined ? undefined : { overrideIndex },
    ),
  );
}

export async function applyPrefabOverrides(
  editor: Editor,
  nodeId: string,
  overrideIndex?: number,
): Promise<void> {
  const node = findNodeById(editor.getScene(), nodeId);
  if (!node || !isPrefabInstanceRoot(node) || node.prefab === undefined) {
    throw new Error(`applyPrefabOverrides: node ${nodeId} is not a prefab instance`);
  }
  const assetId = node.prefab.prefabAssetId;
  const prefab = editor.prefabs.get(assetId);
  if (!prefab) {
    throw new DomainError("MISSING_PREFAB", `Missing prefab ${assetId}`);
  }
  const selected =
    overrideIndex === undefined
      ? (node.prefab.overrides ?? [])
      : [node.prefab.overrides?.[overrideIndex]].filter(
          (override): override is NonNullable<typeof override> => override !== undefined,
        );
  const updated = applyOverridesToPrefabAsset(prefab, selected);
  editor.prefabs.set(assetId, updated);
  const api = editor.prefabs.getApi();
  if (api) {
    await api.savePrefab(assetId, updated);
  }
  editor.execute(
    new RefreshPrefabInstancesCommand(
      editor.document,
      assetId,
      updated,
      editor.prefabs.getCatalog(),
    ),
  );
}

export async function openPrefabDocument(editor: Editor, assetId: string): Promise<void> {
  const prefab = await editor.prefabs.loadPrefabRecord(editor.assets, assetId);
  if (!prefab) {
    throw new DomainError("MISSING_PREFAB", `Prefab asset ${assetId} could not be loaded`);
  }
  if (editor.prefabs.getMode().kind === "scene") {
    editor.prefabs.stashSceneSession(
      editor.getSceneFileId(),
      editor.document.captureSnapshot(),
    );
  } else if (editor.hasUnsavedChanges()) {
    await saveOpenPrefabDocument(editor);
  }
  const record = editor.assets.get(assetId);
  editor.prefabs.setMode({
    kind: "prefab",
    assetId,
    prefabId: record?.metadata.kind === "prefab" ? record.metadata.prefabId : prefab.id,
  });
  const scene = createPrefabEditScene(editor.getScene(), prefab);
  editor.setScene(scene);
  editor.console.log({
    category: "prefab",
    message: `Opened prefab "${prefab.name}"`,
  });
  const rootId = scene.nodes[0]?.id;
  if (rootId) {
    editor.selectNodes([rootId]);
  }
}

export async function closePrefabDocument(editor: Editor): Promise<void> {
  if (editor.prefabs.getMode().kind !== "prefab") {
    return;
  }
  if (editor.hasUnsavedChanges()) {
    await saveOpenPrefabDocument(editor);
  }
  const session = editor.prefabs.takeSceneSession();
  if (!session) {
    editor.restorePrefabSceneSession(undefined);
    return;
  }
  const original = session.snapshot.scene;
  const { scene: resolved } = resolveScenePrefabs(
    cloneJson(original),
    editor.prefabs.getCatalog(),
  );
  const instancesChanged = JSON.stringify(original) !== JSON.stringify(resolved);
  editor.restorePrefabSceneSession({
    ...session,
    snapshot: {
      ...session.snapshot,
      scene: instancesChanged ? resolved : original,
    },
  });
  if (instancesChanged) {
    editor.document.syncDirtyFromContent();
  }
}

export async function saveOpenPrefabDocument(editor: Editor): Promise<void> {
  const mode = editor.prefabs.getMode();
  if (mode.kind !== "prefab") {
    return;
  }
  const root = editor.getScene().nodes[0];
  if (!root) {
    throw new Error("Prefab document is empty");
  }
  const existing = editor.prefabs.get(mode.assetId);
  const prefab: PrefabData = {
    version: existing?.version ?? PREFAB_SCHEMA_VERSION,
    id: existing?.id ?? mode.prefabId,
    name: existing?.name ?? root.name,
    root: cloneSerializableNode(root),
  };
  editor.prefabs.set(mode.assetId, prefab);
  const api = editor.prefabs.getApi();
  if (api) {
    await api.savePrefab(mode.assetId, prefab);
  }
  editor.document.markSaved();
}

export function reportPrefabWorkflowError(
  editor: Editor,
  fallback: string,
  error: unknown,
): void {
  editor.console.log({
    level: "error",
    category: "prefab",
    message: error instanceof Error ? error.message : fallback,
  });
}

function createPrefabEditScene(host: SceneData, prefab: PrefabData): SceneData {
  const root = cloneSerializableNode(prefab.root);
  const renderer = rendererForPrefabDocument(host, root);
  const scene = createEmptyScene(
    `Prefab: ${prefab.name}`,
    renderer === undefined ? undefined : { renderer },
  );
  scene.version = SCENE_SCHEMA_VERSION;
  scene.nodes = [root];
  return scene;
}

function rendererForPrefabDocument(
  host: SceneData,
  root: SceneNodeData,
): SceneData["renderer"] {
  const hostKind = getSceneRendererKind(host);
  let has2d = false;
  let has3d = false;
  for (const node of flattenSubtree(root)) {
    if (getTransform2D(node)) {
      has2d = true;
    }
    if (getTransform3D(node)) {
      has3d = true;
    }
  }
  if (has2d && has3d) {
    return "hybrid";
  }
  if (has3d && hostKind === "pixi") {
    return "three";
  }
  if (has2d && hostKind === "three") {
    return "pixi";
  }
  return host.renderer;
}

function assignInstancePrefabAssetId(root: SceneNodeData, assetId: string): void {
  const instanceId = root.prefab?.instanceId;
  if (instanceId === undefined) {
    return;
  }
  for (const node of flattenSubtree(root)) {
    if (node.prefab?.instanceId === instanceId) {
      node.prefab.prefabAssetId = assetId;
    }
  }
}

function sanitizePrefabFileStem(name: string): string {
  const stem = name.trim().replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return stem.length > 0 ? stem : "Prefab";
}
