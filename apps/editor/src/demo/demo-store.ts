import { DomainError } from "@game-editor/core";
import {
  parseAssetDatabase,
  parseAssetRecord,
  type AssetDatabaseData,
  type AssetRecord,
} from "@game-editor/assets";
import {
  parseProjectData,
  type ProjectData,
} from "@game-editor/project";
import {
  parsePrefabData,
  parseSceneData,
  type PrefabData,
  type SceneData,
} from "@game-editor/scene";
import { SCENES_FOLDER, isValidSceneFileId } from "@game-editor/editor-core";

export const DEMO_STORAGE_KEY = "html5-game-editor.demo.v1";
export const DEMO_STORAGE_SCHEMA_VERSION = 3;
export const DEMO_UNAVAILABLE_CODE = "DEMO_UNAVAILABLE";
export const DEFAULT_DEMO_PROJECT_ID = "editor-features-demo";

export interface DemoSnapshot {
  projectId: string;
  project: ProjectData;
  assets: AssetDatabaseData;
  scenes: Readonly<Record<string, SceneData>>;
  /** Bundled prefab documents keyed by catalogue assetId. */
  prefabs?: Readonly<Record<string, PrefabData>>;
}

export interface DemoProjectSummary {
  id: string;
  name: string;
  displayName: string;
  renderers: ProjectData["renderers"];
}

export interface DemoStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface DemoPersistedProject {
  project: unknown;
  scenes: Record<string, unknown>;
  createdPrefabAssets?: unknown[];
  prefabOverlays?: Record<string, unknown>;
}

interface DemoPersistedV2 {
  version: 2;
  activeProjectId: string;
  projects: Record<string, DemoPersistedProject>;
}

interface DemoPersistedV3 {
  version: 3;
  activeProjectId: string;
  projects: Record<string, DemoPersistedProject>;
}

interface DemoPersistedV1 {
  version: 1;
  project: unknown;
  scenes: Record<string, unknown>;
}

interface DemoProjectState {
  readonly projectId: string;
  assets: AssetDatabaseData;
  project: ProjectData;
  scenes: Map<string, SceneData>;
  prefabs: Map<string, PrefabData>;
}

export function throwDemoUnavailable(action: string): never {
  throw new DomainError(
    DEMO_UNAVAILABLE_CODE,
    `${action} is not available in the static GitHub Pages demo. Run the editor locally with project-server for full project I/O.`,
  );
}

export function clearDemoPersistence(storage: DemoStorage): void {
  storage.removeItem(DEMO_STORAGE_KEY);
}

export function pickDefaultDemoProjectId(projectIds: readonly string[]): string {
  if (projectIds.includes(DEFAULT_DEMO_PROJECT_ID)) {
    return DEFAULT_DEMO_PROJECT_ID;
  }
  const first = [...projectIds].sort()[0];
  if (first === undefined) {
    throw new DomainError("DEMO_EMPTY", "No demo projects were bundled");
  }
  return first;
}

function cloneSceneMap(
  scenes: Readonly<Record<string, SceneData>>,
): Map<string, SceneData> {
  return new Map(
    Object.entries(scenes).map(([id, scene]) => [id, structuredClone(scene)]),
  );
}

function sceneFilePath(sceneId: string): string {
  return `${SCENES_FOLDER}/${sceneId}.json`;
}

function parsePersistedScenes(
  raw: Record<string, unknown>,
): Record<string, SceneData> {
  const scenes: Record<string, SceneData> = {};
  for (const [id, scene] of Object.entries(raw)) {
    if (!isValidSceneFileId(id)) {
      continue;
    }
    scenes[id] = parseSceneData(scene);
  }
  return scenes;
}

/**
 * In-memory snapshots of every `games/*` project. Scene/project edits persist
 * in localStorage; asset catalogues stay read-only static files.
 */
export class DemoProjectStore {
  private readonly states = new Map<string, DemoProjectState>();
  private activeId: string;
  private readonly storage: DemoStorage | undefined;

  constructor(bundled: readonly DemoSnapshot[], storage?: DemoStorage) {
    if (bundled.length === 0) {
      throw new DomainError("DEMO_EMPTY", "No demo projects were bundled");
    }
    this.storage = storage;
    for (const snapshot of bundled) {
      this.states.set(snapshot.projectId, {
        projectId: snapshot.projectId,
        assets: parseAssetDatabase(structuredClone(snapshot.assets)),
        project: structuredClone(snapshot.project),
        scenes: cloneSceneMap(snapshot.scenes),
        prefabs: clonePrefabMap(snapshot.prefabs ?? {}),
      });
    }
    const restored = this.readPersisted();
    this.activeId = pickDefaultDemoProjectId([...this.states.keys()]);
    if (restored) {
      for (const [id, overlay] of Object.entries(restored.projects)) {
        const state = this.states.get(id);
        if (!state) {
          continue;
        }
        state.project = overlay.project;
        state.scenes = cloneSceneMap(overlay.scenes);
        mergeCreatedPrefabAssets(state, overlay.createdPrefabAssets);
        applyPrefabOverlays(state, overlay.prefabOverlays);
      }
      if (this.states.has(restored.activeProjectId)) {
        this.activeId = restored.activeProjectId;
      }
    }
  }

  get projectId(): string {
    return this.activeId;
  }

  get assets(): AssetDatabaseData {
    return this.active().assets;
  }

  listProjectSummaries(): DemoProjectSummary[] {
    return [...this.states.values()]
      .map((state) => ({
        id: state.projectId,
        name: state.project.name,
        displayName: state.project.displayName,
        renderers: state.project.renderers,
      }))
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  openProject(projectId: string): ProjectData {
    if (!this.states.has(projectId)) {
      throw new DomainError(
        "PROJECT_NOT_FOUND",
        `Unknown demo project "${projectId}"`,
      );
    }
    this.activeId = projectId;
    this.persist();
    return this.getProject();
  }

  getProject(): ProjectData {
    return structuredClone(this.active().project);
  }

  saveProject(project: ProjectData): ProjectData {
    const state = this.active();
    state.project = parseProjectData(project);
    this.persist();
    return this.getProject();
  }

  listSceneEntries(): Array<{ id: string; path: string }> {
    return [...this.active().scenes.keys()]
      .sort()
      .map((id) => ({ id, path: sceneFilePath(id) }));
  }

  loadScene(sceneId: string): SceneData {
    const scene = this.active().scenes.get(sceneId);
    if (scene === undefined) {
      throw new DomainError("SCENE_NOT_FOUND", `Unknown scene "${sceneId}"`);
    }
    return structuredClone(scene);
  }

  saveScene(sceneId: string, scene: SceneData): SceneData {
    this.requireSceneId(sceneId);
    const parsed = parseSceneData(scene);
    this.active().scenes.set(sceneId, parsed);
    this.persist();
    return structuredClone(parsed);
  }

  createScene(sceneId: string, scene: SceneData): SceneData {
    this.requireSceneId(sceneId);
    const scenes = this.active().scenes;
    if (scenes.has(sceneId)) {
      throw new DomainError(
        "SCENE_EXISTS",
        `Scene "${sceneId}" already exists`,
      );
    }
    const parsed = parseSceneData(scene);
    scenes.set(sceneId, parsed);
    this.persist();
    return structuredClone(parsed);
  }

  renameScene(
    sceneId: string,
    newSceneId: string,
  ): { id: string; path: string } {
    this.requireSceneId(sceneId);
    this.requireSceneId(newSceneId);
    const state = this.active();
    const scene = state.scenes.get(sceneId);
    if (scene === undefined) {
      throw new DomainError("SCENE_NOT_FOUND", `Unknown scene "${sceneId}"`);
    }
    if (state.scenes.has(newSceneId)) {
      throw new DomainError(
        "SCENE_EXISTS",
        `Scene "${newSceneId}" already exists`,
      );
    }
    state.scenes.delete(sceneId);
    state.scenes.set(newSceneId, scene);
    if (state.project.startScene === sceneId) {
      state.project = { ...state.project, startScene: newSceneId };
    }
    this.persist();
    return { id: newSceneId, path: sceneFilePath(newSceneId) };
  }

  deleteScene(sceneId: string): void {
    this.requireSceneId(sceneId);
    const state = this.active();
    if (!state.scenes.has(sceneId)) {
      throw new DomainError("SCENE_NOT_FOUND", `Unknown scene "${sceneId}"`);
    }
    if (state.scenes.size <= 1) {
      throw new DomainError(
        "SCENE_REQUIRED",
        "The demo must keep at least one scene",
      );
    }
    if (state.project.startScene === sceneId) {
      throw new DomainError(
        "SCENE_IN_USE",
        "Cannot delete the project start scene in the demo",
      );
    }
    state.scenes.delete(sceneId);
    this.persist();
  }

  getPrefab(assetId: string): PrefabData | undefined {
    const prefab = this.active().prefabs.get(assetId);
    return prefab === undefined ? undefined : structuredClone(prefab);
  }

  savePrefab(assetId: string, prefab: PrefabData): PrefabData {
    const parsed = parsePrefabData(prefab);
    this.active().prefabs.set(assetId, parsed);
    this.persist();
    return structuredClone(parsed);
  }

  addPrefabAsset(asset: AssetRecord, prefab: PrefabData): void {
    const state = this.active();
    if (state.assets.assets.some((existing) => existing.id === asset.id)) {
      throw new DomainError("ASSET_EXISTS", `Asset ${asset.id} already exists`);
    }
    state.assets = {
      ...state.assets,
      assets: [...state.assets.assets, asset],
    };
    state.prefabs.set(asset.id, parsePrefabData(prefab));
    this.persist();
  }

  allocatePrefabPath(stem: string, destination?: string): string {
    const sanitized = stem.trim().replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
    const base = sanitized.length > 0 ? sanitized : "Prefab";
    const folder =
      destination && destination.length > 0
        ? destination.replace(/\/$/, "")
        : "assets/prefabs";
    const used = new Set(this.active().assets.assets.map((asset) => asset.path));
    let relative = `${folder}/${base}.prefab.json`;
    let suffix = 2;
    while (used.has(relative)) {
      relative = `${folder}/${base}-${String(suffix)}.prefab.json`;
      suffix += 1;
    }
    return relative;
  }

  private active(): DemoProjectState {
    const state = this.states.get(this.activeId);
    if (!state) {
      throw new DomainError("DEMO_EMPTY", "Active demo project is missing");
    }
    return state;
  }

  private requireSceneId(sceneId: string): void {
    if (!isValidSceneFileId(sceneId)) {
      throw new DomainError("INVALID_SCENE_ID", `Invalid scene id: ${sceneId}`);
    }
  }

  private persist(): void {
    if (!this.storage) {
      return;
    }
    const projects: DemoPersistedV3["projects"] = {};
    for (const state of this.states.values()) {
      projects[state.projectId] = {
        project: state.project,
        scenes: Object.fromEntries(state.scenes),
        createdPrefabAssets: state.assets.assets.filter(
          (asset) => asset.type === "prefab",
        ),
        prefabOverlays: Object.fromEntries(state.prefabs),
      };
    }
    const payload: DemoPersistedV3 = {
      version: DEMO_STORAGE_SCHEMA_VERSION,
      activeProjectId: this.activeId,
      projects,
    };
    this.storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(payload));
  }

  private readPersisted():
    | {
        activeProjectId: string;
        projects: Record<
          string,
          {
            project: ProjectData;
            scenes: Record<string, SceneData>;
            createdPrefabAssets?: AssetRecord[];
            prefabOverlays?: Record<string, PrefabData>;
          }
        >;
      }
    | undefined {
    if (!this.storage) {
      return undefined;
    }
    const raw = this.storage.getItem(DEMO_STORAGE_KEY);
    if (!raw) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(raw) as DemoPersistedV1 | DemoPersistedV2 | DemoPersistedV3;
      if (parsed.version === 1) {
        const scenes = parsePersistedScenes(parsed.scenes);
        if (Object.keys(scenes).length === 0) {
          return undefined;
        }
        return {
          activeProjectId: DEFAULT_DEMO_PROJECT_ID,
          projects: {
            [DEFAULT_DEMO_PROJECT_ID]: {
              project: parseProjectData(parsed.project),
              scenes,
            },
          },
        };
      }
      if (parsed.version !== 2 && parsed.version !== 3) {
        return undefined;
      }
      const projects: Record<
        string,
        {
          project: ProjectData;
          scenes: Record<string, SceneData>;
          createdPrefabAssets?: AssetRecord[];
          prefabOverlays?: Record<string, PrefabData>;
        }
      > = {};
      for (const [id, overlay] of Object.entries(parsed.projects)) {
        const scenes = parsePersistedScenes(overlay.scenes);
        if (Object.keys(scenes).length === 0) {
          continue;
        }
        projects[id] = {
          project: parseProjectData(overlay.project),
          scenes,
          createdPrefabAssets: parsePersistedPrefabAssets(overlay.createdPrefabAssets),
          prefabOverlays: parsePersistedPrefabs(overlay.prefabOverlays),
        };
      }
      if (Object.keys(projects).length === 0) {
        return undefined;
      }
      return { activeProjectId: parsed.activeProjectId, projects };
    } catch {
      return undefined;
    }
  }
}

function clonePrefabMap(
  prefabs: Readonly<Record<string, PrefabData>>,
): Map<string, PrefabData> {
  return new Map(
    Object.entries(prefabs).map(([id, prefab]) => [id, structuredClone(prefab)]),
  );
}

function mergeCreatedPrefabAssets(
  state: DemoProjectState,
  created: readonly AssetRecord[] | undefined,
): void {
  if (created === undefined || created.length === 0) {
    return;
  }
  const existing = new Set(state.assets.assets.map((asset) => asset.id));
  const extra = created.filter((asset) => !existing.has(asset.id));
  if (extra.length === 0) {
    return;
  }
  state.assets = {
    ...state.assets,
    assets: [...state.assets.assets, ...extra],
  };
}

function applyPrefabOverlays(
  state: DemoProjectState,
  overlays: Readonly<Record<string, PrefabData>> | undefined,
): void {
  if (overlays === undefined) {
    return;
  }
  for (const [assetId, prefab] of Object.entries(overlays)) {
    state.prefabs.set(assetId, structuredClone(prefab));
  }
}

function parsePersistedPrefabAssets(
  raw: unknown[] | undefined,
): AssetRecord[] | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const assets: AssetRecord[] = [];
  for (const entry of raw) {
    try {
      assets.push(parseAssetRecord(entry));
    } catch {
      // Skip invalid overlay records.
    }
  }
  return assets;
}

function parsePersistedPrefabs(
  raw: Record<string, unknown> | undefined,
): Record<string, PrefabData> | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const prefabs: Record<string, PrefabData> = {};
  for (const [id, value] of Object.entries(raw)) {
    try {
      prefabs[id] = parsePrefabData(value);
    } catch {
      // Skip invalid overlay documents.
    }
  }
  return prefabs;
}
