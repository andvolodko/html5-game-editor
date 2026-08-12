import {
  AssetDatabase,
  createStaticAssetResolver,
  type AssetResolver,
} from "@game-editor/assets";
import {
  parseProjectData,
  type ProjectData,
} from "@game-editor/project";
import { parseSceneData, type SceneData } from "@game-editor/scene";

export interface LoadedGameProject {
  project: ProjectData;
  scene: SceneData;
  /** All bundled scenes keyed by file id (includes `project.startScene`). */
  scenes: Readonly<Record<string, SceneData>>;
  assets: AssetDatabase;
  assetResolver: AssetResolver;
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
  const scene = scenes[project.startScene];
  if (scene === undefined) {
    throw new Error(
      `Start scene "${project.startScene}" was not found in bundled scenes`,
    );
  }
  const assets = AssetDatabase.fromUnknown(input.assets);
  const assetResolver = createStaticAssetResolver(assets, {
    baseUrl: input.baseUrl,
  });
  return { project, scene, scenes, assets, assetResolver };
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
