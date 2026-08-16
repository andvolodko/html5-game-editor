import { parseAssetDatabase, createEmptyAssetDatabase } from "@game-editor/assets";
import { parseProjectData } from "@game-editor/project";
import { parsePrefabData, parseSceneData, type PrefabData, type SceneData } from "@game-editor/scene";
import type { ComponentCatalogData } from "@game-editor/game-components";
import {
  projectIdFromGlobPath,
  sceneIdFromGlobPath,
} from "./demo-glob-paths";
import type { DemoSnapshot } from "./demo-store";

const DEMO_ASSET_MOUNT = "demo";

const projectModules = import.meta.glob(
  "../../../../games/*/project.json",
  { eager: true, import: "default" },
);
const assetsModules = import.meta.glob(
  "../../../../games/*/.project/assets.json",
  { eager: true, import: "default" },
);
const sceneModules = import.meta.glob(
  "../../../../games/*/assets/scenes/*.json",
  { eager: true, import: "default" },
);
const prefabModules = import.meta.glob(
  "../../../../games/*/assets/prefabs/**/*.prefab.json",
  { eager: true, import: "default" },
);
const catalogModules = import.meta.glob<{
  getComponentCatalog?: () => ComponentCatalogData;
}>(
  "../../../../games/*/src/components/index.ts",
  { eager: true },
);

function groupByProjectId<T>(
  modules: Readonly<Record<string, T>>,
): Map<string, T> {
  const grouped = new Map<string, T>();
  for (const [modulePath, value] of Object.entries(modules)) {
    const projectId = projectIdFromGlobPath(modulePath);
    if (projectId === undefined) {
      continue;
    }
    grouped.set(projectId, value);
  }
  return grouped;
}

/** Static files live at `${base}demo/<projectId>/assets/...`. */
export function demoAssetBaseUrl(baseUrl = import.meta.env.BASE_URL): string {
  const normalized = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${normalized}${DEMO_ASSET_MOUNT}/`;
}

export function loadBundledDemoSnapshots(): DemoSnapshot[] {
  const projects = groupByProjectId(projectModules);
  const assets = groupByProjectId(assetsModules);
  const scenesByProject = new Map<string, Record<string, SceneData>>();
  for (const [modulePath, raw] of Object.entries(sceneModules)) {
    const projectId = projectIdFromGlobPath(modulePath);
    const sceneId = sceneIdFromGlobPath(modulePath);
    if (projectId === undefined || sceneId === undefined) {
      continue;
    }
    const bucket = scenesByProject.get(projectId) ?? {};
    bucket[sceneId] = parseSceneData(raw);
    scenesByProject.set(projectId, bucket);
  }

  const snapshots: DemoSnapshot[] = [];
  for (const [projectId, projectRaw] of projects) {
    const scenes = scenesByProject.get(projectId) ?? {};
    const project = parseProjectData(projectRaw);
    if (scenes[project.startScene] === undefined) {
      continue;
    }
    const database = parseAssetDatabase(
      assets.get(projectId) ?? createEmptyAssetDatabase(),
    );
    snapshots.push({
      projectId,
      project,
      assets: database,
      scenes,
      prefabs: prefabsForProject(projectId, database, prefabModules),
    });
  }
  snapshots.sort((left, right) => left.projectId.localeCompare(right.projectId));
  if (snapshots.length === 0) {
    throw new Error("No playable games were bundled into the editor demo");
  }
  return snapshots;
}

export function loadDemoComponentCatalogs(): Record<string, ComponentCatalogData> {
  const catalogs: Record<string, ComponentCatalogData> = {};
  for (const [modulePath, catalogModule] of Object.entries(catalogModules)) {
    const projectId = projectIdFromGlobPath(modulePath);
    if (projectId === undefined || catalogModule.getComponentCatalog === undefined) {
      continue;
    }
    catalogs[projectId] = catalogModule.getComponentCatalog();
  }
  return catalogs;
}

function prefabsForProject(
  projectId: string,
  assets: ReturnType<typeof parseAssetDatabase>,
  modules: Readonly<Record<string, unknown>>,
): Record<string, PrefabData> {
  const byPath = new Map<string, unknown>();
  for (const [modulePath, raw] of Object.entries(modules)) {
    if (projectIdFromGlobPath(modulePath) !== projectId) {
      continue;
    }
    const normalized = modulePath.replaceAll("\\", "/");
    const marker = "/assets/";
    const index = normalized.lastIndexOf(marker);
    if (index < 0) {
      continue;
    }
    byPath.set(`assets/${normalized.slice(index + marker.length)}`, raw);
  }
  const prefabs: Record<string, PrefabData> = {};
  for (const record of assets.assets) {
    if (record.type !== "prefab") {
      continue;
    }
    const raw = byPath.get(record.path);
    if (raw === undefined) {
      continue;
    }
    prefabs[record.id] = parsePrefabData(raw);
  }
  return prefabs;
}
