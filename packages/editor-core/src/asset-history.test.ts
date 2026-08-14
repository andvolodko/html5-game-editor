import { describe, expect, it, vi } from "vitest";
import {
  createTextureAssetRecord,
  type AssetDatabaseData,
  type AssetRecord,
} from "@game-editor/assets";
import { createEmptyScene } from "@game-editor/scene";
import { Editor } from "./index.js";

function emptyDeleteResult(folders = ["assets"]) {
  return {
    database: { version: 1, assets: [] } satisfies AssetDatabaseData,
    revision: "rev-deleted",
    folders,
  };
}

describe("Editor asset history", () => {
  it("undo/redo restores a deleted asset id", async () => {
    const record = createTextureAssetRecord({
      id: "asset_hero",
      name: "hero",
      path: "assets/hero.png",
      width: 1,
      height: 1,
      mimeType: "image/png",
    });
    let current: AssetRecord | undefined = record;
    const editor = new Editor({
      scene: createEmptyScene("Test"),
      assetApi: {
        listAssets: async () => ({
          database: { version: 1, assets: current ? [current] : [] },
          revision: "rev",
          folders: ["assets"],
        }),
        importAssets: async () => {
          throw new Error("unused");
        },
        createFolder: async () => {
          throw new Error("unused");
        },
        renameAsset: async () => {
          throw new Error("unused");
        },
        moveAsset: async () => {
          throw new Error("unused");
        },
        duplicateAsset: async () => {
          throw new Error("unused");
        },
        restoreAsset: async (assetId) => {
          current = { ...record, id: assetId };
          return {
            asset: current,
            database: { version: 1, assets: [current] },
            revision: "rev-restored",
            folders: ["assets"],
          };
        },
        deleteAsset: async () => {
          current = undefined;
          return emptyDeleteResult();
        },
        renameFolder: async () => {
          throw new Error("unused");
        },
        restoreFolder: async () => {
          throw new Error("unused");
        },
        deleteFolder: async () => {
          throw new Error("unused");
        },
        getAssetContentUrl: (id) => `/assets/${id}/content`,
        getAssetPartUrl: (id, part) => `/assets/${id}/part/${part}`,
      },
    });
    editor.assets.getDatabase().add(record);

    await editor.deleteAsset("asset_hero");
    expect(editor.assets.get("asset_hero")).toBeUndefined();
    expect(editor.commands.canUndo).toBe(true);

    editor.undo();
    await vi.waitFor(() => {
      expect(editor.assets.get("asset_hero")?.id).toBe("asset_hero");
    });

    editor.redo();
    await vi.waitFor(() => {
      expect(editor.assets.get("asset_hero")).toBeUndefined();
    });
  });

  it("undo/redo restores a renamed asset display name", async () => {
    const record = createTextureAssetRecord({
      id: "asset_hero",
      name: "hero",
      path: "assets/hero.png",
      width: 1,
      height: 1,
      mimeType: "image/png",
    });
    let current: AssetRecord = record;
    const editor = new Editor({
      scene: createEmptyScene("Test"),
      assetApi: {
        listAssets: async () => ({
          database: { version: 1, assets: [current] },
          revision: "rev",
          folders: ["assets"],
        }),
        importAssets: async () => {
          throw new Error("unused");
        },
        createFolder: async () => {
          throw new Error("unused");
        },
        renameAsset: async (_assetId, name) => {
          const ext = current.path.slice(current.path.lastIndexOf("."));
          current = {
            ...current,
            name,
            path: `assets/${name}${ext}`,
          };
          return {
            asset: current,
            database: { version: 1, assets: [current] },
            revision: `rev-${name}`,
            folders: ["assets"],
          };
        },
        moveAsset: async () => {
          throw new Error("unused");
        },
        duplicateAsset: async () => {
          throw new Error("unused");
        },
        restoreAsset: async () => {
          throw new Error("unused");
        },
        deleteAsset: async () => {
          throw new Error("unused");
        },
        renameFolder: async () => {
          throw new Error("unused");
        },
        restoreFolder: async () => {
          throw new Error("unused");
        },
        deleteFolder: async () => {
          throw new Error("unused");
        },
        getAssetContentUrl: (id) => `/assets/${id}/content`,
        getAssetPartUrl: (id, part) => `/assets/${id}/part/${part}`,
      },
    });
    editor.assets.getDatabase().add(record);

    await editor.renameAsset("asset_hero", "player");
    expect(editor.assets.get("asset_hero")?.name).toBe("player");

    editor.undo();
    await vi.waitFor(() => {
      expect(editor.assets.get("asset_hero")?.name).toBe("hero");
    });

    editor.redo();
    await vi.waitFor(() => {
      expect(editor.assets.get("asset_hero")?.name).toBe("player");
    });
  });

  it("undo/redo of duplicate removes then restores the copy", async () => {
    const original = createTextureAssetRecord({
      id: "asset_hero",
      name: "hero",
      path: "assets/hero.png",
      width: 1,
      height: 1,
      mimeType: "image/png",
    });
    const copy = createTextureAssetRecord({
      id: "asset_hero_copy",
      name: "hero-1",
      path: "assets/hero-1.png",
      width: 1,
      height: 1,
      mimeType: "image/png",
    });
    const assets = new Map<string, AssetRecord>([[original.id, original]]);
    const editor = new Editor({
      scene: createEmptyScene("Test"),
      assetApi: {
        listAssets: async () => ({
          database: { version: 1, assets: [...assets.values()] },
          revision: "rev",
          folders: ["assets"],
        }),
        importAssets: async () => {
          throw new Error("unused");
        },
        createFolder: async () => {
          throw new Error("unused");
        },
        renameAsset: async () => {
          throw new Error("unused");
        },
        moveAsset: async () => {
          throw new Error("unused");
        },
        duplicateAsset: async () => {
          assets.set(copy.id, copy);
          return {
            asset: copy,
            database: { version: 1, assets: [...assets.values()] },
            revision: "rev-dup",
            folders: ["assets"],
          };
        },
        restoreAsset: async (assetId) => {
          const restored = assetId === copy.id ? copy : original;
          assets.set(restored.id, restored);
          return {
            asset: restored,
            database: { version: 1, assets: [...assets.values()] },
            revision: "rev-restored",
            folders: ["assets"],
          };
        },
        deleteAsset: async (assetId) => {
          assets.delete(assetId);
          return {
            database: { version: 1, assets: [...assets.values()] },
            revision: "rev-deleted",
            folders: ["assets"],
          };
        },
        renameFolder: async () => {
          throw new Error("unused");
        },
        restoreFolder: async () => {
          throw new Error("unused");
        },
        deleteFolder: async () => {
          throw new Error("unused");
        },
        getAssetContentUrl: (id) => `/assets/${id}/content`,
        getAssetPartUrl: (id, part) => `/assets/${id}/part/${part}`,
      },
    });
    editor.assets.getDatabase().add(original);

    await editor.duplicateAsset("asset_hero");
    expect(editor.assets.get("asset_hero_copy")?.name).toBe("hero-1");

    editor.undo();
    await vi.waitFor(() => {
      expect(editor.assets.get("asset_hero_copy")).toBeUndefined();
    });
    expect(editor.assets.get("asset_hero")).toBeDefined();

    editor.redo();
    await vi.waitFor(() => {
      expect(editor.assets.get("asset_hero_copy")?.id).toBe("asset_hero_copy");
    });
  });

  it("undo/redo restores a renamed folder path", async () => {
    let folder = "assets/icons";
    const editor = new Editor({
      scene: createEmptyScene("Test"),
      assetApi: {
        listAssets: async () => ({
          database: { version: 1, assets: [] },
          revision: "rev",
          folders: ["assets", folder],
        }),
        importAssets: async () => {
          throw new Error("unused");
        },
        createFolder: async () => {
          throw new Error("unused");
        },
        renameAsset: async () => {
          throw new Error("unused");
        },
        moveAsset: async () => {
          throw new Error("unused");
        },
        duplicateAsset: async () => {
          throw new Error("unused");
        },
        restoreAsset: async () => {
          throw new Error("unused");
        },
        deleteAsset: async () => {
          throw new Error("unused");
        },
        renameFolder: async (_path, name) => {
          folder = `assets/${name}`;
          return {
            folder,
            database: { version: 1, assets: [] },
            revision: `rev-${name}`,
            folders: ["assets", folder],
          };
        },
        restoreFolder: async () => {
          throw new Error("unused");
        },
        deleteFolder: async () => {
          throw new Error("unused");
        },
        getAssetContentUrl: (id) => `/assets/${id}/content`,
        getAssetPartUrl: (id, part) => `/assets/${id}/part/${part}`,
      },
    });

    const next = await editor.renameFolder("assets/icons", "ui");
    expect(next).toBe("assets/ui");

    editor.undo();
    await vi.waitFor(() => {
      expect(editor.assets.getFolders()).toContain("assets/icons");
    });

    editor.redo();
    await vi.waitFor(() => {
      expect(editor.assets.getFolders()).toContain("assets/ui");
    });
  });

  it("undo/redo restores a deleted folder", async () => {
    const coin = createTextureAssetRecord({
      id: "asset_coin",
      name: "coin",
      path: "assets/icons/coin.png",
      width: 1,
      height: 1,
      mimeType: "image/png",
    });
    let folders = ["assets", "assets/icons"];
    let current: AssetRecord | undefined = coin;
    const editor = new Editor({
      scene: createEmptyScene("Test"),
      assetApi: {
        listAssets: async () => ({
          database: { version: 1, assets: current ? [current] : [] },
          revision: "rev",
          folders,
        }),
        importAssets: async () => {
          throw new Error("unused");
        },
        createFolder: async () => {
          throw new Error("unused");
        },
        renameAsset: async () => {
          throw new Error("unused");
        },
        moveAsset: async () => {
          throw new Error("unused");
        },
        duplicateAsset: async () => {
          throw new Error("unused");
        },
        restoreAsset: async () => {
          throw new Error("unused");
        },
        deleteAsset: async () => {
          throw new Error("unused");
        },
        renameFolder: async () => {
          throw new Error("unused");
        },
        restoreFolder: async () => {
          current = coin;
          folders = ["assets", "assets/icons"];
          return {
            folder: "assets/icons",
            database: { version: 1, assets: [coin] },
            revision: "rev-restored",
            folders,
          };
        },
        deleteFolder: async () => {
          current = undefined;
          folders = ["assets"];
          return {
            database: { version: 1, assets: [] },
            revision: "rev-deleted",
            folders,
          };
        },
        getAssetContentUrl: (id) => `/assets/${id}/content`,
        getAssetPartUrl: (id, part) => `/assets/${id}/part/${part}`,
      },
    });
    editor.assets.getDatabase().add(coin);

    await editor.deleteFolder("assets/icons");
    expect(editor.assets.get("asset_coin")).toBeUndefined();

    editor.undo();
    await vi.waitFor(() => {
      expect(editor.assets.get("asset_coin")?.id).toBe("asset_coin");
    });
    expect(editor.assets.getFolders()).toContain("assets/icons");

    editor.redo();
    await vi.waitFor(() => {
      expect(editor.assets.get("asset_coin")).toBeUndefined();
    });
  });
});
