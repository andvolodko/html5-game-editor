import {
  computePrefabOverrides,
  flattenNodes,
  isPrefabInstanceRoot,
  parsePrefabData,
  prefabValuesEqual,
  type PrefabCatalog,
  type PrefabData,
} from "@game-editor/scene";
import type {
  DocumentContentSnapshot,
  DocumentManager,
} from "./document-manager.js";
import type { AssetManager } from "./asset-manager.js";
import type { PrefabApiClient } from "./prefab-api-client.js";

export type EditorDocumentMode =
  | { kind: "scene"; sceneFileId: string }
  | { kind: "prefab"; assetId: string; prefabId: string };

export class PrefabManager {
  private readonly catalog = new Map<string, PrefabData>();
  private api: PrefabApiClient | undefined;
  private mode: EditorDocumentMode = { kind: "scene", sceneFileId: "main" };
  private sceneSession:
    | { sceneFileId: string; snapshot: DocumentContentSnapshot }
    | undefined;

  setApi(api: PrefabApiClient | undefined): void {
    this.api = api;
  }

  getApi(): PrefabApiClient | undefined {
    return this.api;
  }

  getMode(): EditorDocumentMode {
    return this.mode;
  }

  setMode(mode: EditorDocumentMode): void {
    this.mode = mode;
  }

  stashSceneSession(
    sceneFileId: string,
    snapshot: DocumentContentSnapshot,
  ): void {
    this.sceneSession = { sceneFileId, snapshot };
  }

  takeSceneSession():
    | { sceneFileId: string; snapshot: DocumentContentSnapshot }
    | undefined {
    const session = this.sceneSession;
    this.sceneSession = undefined;
    return session;
  }

  getCatalog(): PrefabCatalog {
    return this.catalog;
  }

  get(assetId: string): PrefabData | undefined {
    return this.catalog.get(assetId);
  }

  set(assetId: string, prefab: PrefabData): void {
    this.catalog.set(assetId, prefab);
  }

  remove(assetId: string): void {
    this.catalog.delete(assetId);
  }

  async refreshFromAssets(assets: AssetManager): Promise<void> {
    const next = new Map<string, PrefabData>();
    for (const record of assets.getAll()) {
      if (record.type !== "prefab") {
        continue;
      }
      const existing = this.catalog.get(record.id);
      if (existing) {
        next.set(record.id, existing);
        continue;
      }
      const loaded = await this.loadPrefabRecord(assets, record.id);
      if (loaded) {
        next.set(record.id, loaded);
      }
    }
    this.catalog.clear();
    for (const [id, prefab] of next) {
      this.catalog.set(id, prefab);
    }
  }

  async loadPrefabRecord(
    assets: AssetManager,
    assetId: string,
  ): Promise<PrefabData | undefined> {
    if (this.api) {
      try {
        const prefab = await this.api.loadPrefab(assetId);
        this.catalog.set(assetId, prefab);
        return prefab;
      } catch {
        // Fall through to content URL (demo / static).
      }
    }
    const cached = this.catalog.get(assetId);
    const url = assets.getContentUrl(assetId);
    if (url === undefined || url.length === 0) {
      return cached;
    }
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return cached;
      }
      const prefab = parsePrefabData(await response.json());
      this.catalog.set(assetId, prefab);
      return prefab;
    } catch {
      return cached;
    }
  }

  syncOverrides(document: DocumentManager): void {
    for (const node of flattenNodes(document.getScene())) {
      if (!isPrefabInstanceRoot(node) || node.prefab === undefined) {
        continue;
      }
      const prefab = this.catalog.get(node.prefab.prefabAssetId);
      if (prefab === undefined) {
        continue;
      }
      const overrides = computePrefabOverrides(prefab.root, node);
      if (prefabValuesEqual(overrides, node.prefab.overrides ?? [])) {
        continue;
      }
      document.setPrefabOverrides(node.id, overrides);
    }
  }
}
