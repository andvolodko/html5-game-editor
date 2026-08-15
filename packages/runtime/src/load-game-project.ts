import {
  AssetDatabase,
  createStaticAssetResolver,
  type AssetResolver,
} from "@game-editor/assets";
import {
  parseProjectData,
  type ProjectData,
} from "@game-editor/project";
import {
  parsePrefabData,
  parseSceneData,
  resolveScenePrefabs,
  type PrefabCatalog,
  type PrefabData,
  type SceneData,
} from "@game-editor/scene";

export interface LoadedGameProject {
  project: ProjectData;
  scene: SceneData;
  /** All bundled scenes keyed by file id (includes `project.startScene`). */
  scenes: Readonly<Record<string, SceneData>>;
  assets: AssetDatabase;
  assetResolver: AssetResolver;
  prefabs: PrefabCatalog;
}

export interface ResolveGameProjectInput {
  /** Raw project.json contents. */
  project: unknown;
  /** Raw .project/assets.json contents. */
  assets: unknown;
  /**
   * Scene file id → raw scene JSON.
   * Must include `project.startScene`.
   */
  scenes: Readonly<Record<string, unknown>>;
  /** URL prefix for static asset paths (default "/"). */
  baseUrl?: string;
  /**
   * Prefab JSON keyed by project-relative path
   * (e.g. `assets/prefabs/ui-button.prefab.json`).
   */
  prefabsByPath?: Readonly<Record<string, unknown>>;
}

/**
 * Builds a playable game project from bundled manifests + start scene.
 * Does not depend on the editor or project-server.
 */
export function resolveGameProject(
  input: ResolveGameProjectInput,
): LoadedGameProject {
  const project = parseProjectData(input.project);
  const scenes: Record<string, SceneData> = {};
  for (const [sceneId, raw] of Object.entries(input.scenes)) {
    scenes[sceneId] = parseSceneData(raw);
  }
  if (scenes[project.startScene] === undefined) {
    throw new Error(
      `Start scene "${project.startScene}" was not found in bundled scenes`,
    );
  }
  const assets = AssetDatabase.fromUnknown(input.assets);
  const prefabs = buildPrefabCatalog(assets, input.prefabsByPath ?? {});
  const resolvedScenes: Record<string, SceneData> = {};
  for (const [sceneId, parsed] of Object.entries(scenes)) {
    resolvedScenes[sceneId] = resolveScenePrefabs(parsed, prefabs).scene;
  }
  const resolvedStart = resolvedScenes[project.startScene];
  if (resolvedStart === undefined) {
    throw new Error(
      `Start scene "${project.startScene}" was not found in bundled scenes`,
    );
  }
  const assetResolver = createStaticAssetResolver(assets, {
    baseUrl: input.baseUrl,
  });
  return {
    project,
    scene: resolvedStart,
    scenes: resolvedScenes,
    assets,
    assetResolver,
    prefabs,
  };
}

export function buildPrefabCatalog(
  assets: AssetDatabase,
  prefabsByPath: Readonly<Record<string, unknown>>,
): PrefabCatalog {
  const catalog = new Map<string, PrefabData>();
  for (const record of assets.getAll()) {
    if (record.type !== "prefab") {
      continue;
    }
    const raw = prefabsByPath[record.path];
    if (raw === undefined) {
      continue;
    }
    catalog.set(record.id, parsePrefabData(raw));
  }
  return catalog;
}

/**
 * Collects Vite `import.meta.glob` prefab modules keyed by project-relative path.
 * Expects keys like `../assets/prefabs/ui-button.prefab.json`.
 */
export function prefabModulesByPath(
  modules: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const prefabs: Record<string, unknown> = {};
  for (const [modulePath, data] of Object.entries(modules)) {
    const normalized = modulePath.replaceAll("\\", "/");
    const marker = "/assets/";
    const index = normalized.lastIndexOf(marker);
    if (index < 0) {
      continue;
    }
    prefabs[`assets/${normalized.slice(index + marker.length)}`] = data;
  }
  return prefabs;
}

/**
 * Collects Vite `import.meta.glob` scene modules keyed by file id.
 * Expects keys like `../assets/scenes/main.json`.
 */
export function sceneModulesById(
  modules: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const scenes: Record<string, unknown> = {};
  for (const [modulePath, data] of Object.entries(modules)) {
    const match = /\/([^/]+)\.json$/i.exec(modulePath.replaceAll("\\", "/"));
    if (!match?.[1]) {
      continue;
    }
    scenes[match[1]] = data;
  }
  return scenes;
}
