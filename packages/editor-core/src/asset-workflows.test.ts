import { describe, expect, it, vi } from "vitest";
import { createEmptyScene, getModel3D, getSpine, getSprite, getAnimatedSprite, getTransform3D, findNodeById } from "@game-editor/scene";
import {
  createAudioAssetRecord,
  createGltfAssetRecord,
  createSpineAssetRecord,
  createTextureAssetRecord,
  createAsepriteAssetRecord,
  type AssetDatabaseData,
} from "@game-editor/assets";
import {
  decodeAssetDragPayload,
  dropAssetOntoScene,
  Editor,
  encodeAssetDragPayload,
  importDroppedFiles,
} from "./index.js";

describe("asset workflows", () => {
  it("encodes and decodes drag payloads", () => {
    const raw = encodeAssetDragPayload({ assetId: "asset_1" });
    expect(decodeAssetDragPayload(raw)).toEqual({ assetId: "asset_1" });
    expect(decodeAssetDragPayload("not-json")).toBeUndefined();
  });

  it("dropAssetOntoScene creates a sprite via command with texture size override", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const record = createTextureAssetRecord({
      id: "asset_hero",
      name: "hero",
      path: "assets/hero.png",
      width: 128,
      height: 64,
      mimeType: "image/png",
    });
    editor.assets.getDatabase().add(record);

    const nodeId = dropAssetOntoScene(editor, "asset_hero", { x: 10, y: 20 });
    const node = editor.getScene().nodes.find((n) => n.id === nodeId);
    const sprite = node ? getSprite(node) : undefined;
    expect(sprite?.assetId).toBe("asset_hero");
    expect(sprite?.width).toBe(128);
    expect(sprite?.height).toBe(64);
    expect(editor.getDirtyState()).toBe("dirty");

    editor.undo();
    expect(editor.getScene().nodes).toHaveLength(0);
  });

  it("dropAssetOntoScene creates a spine node for spine assets", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    editor.assets.getDatabase().add(
      createSpineAssetRecord({
        id: "asset_spine",
        name: "hero",
        path: "assets/hero/hero.json",
        skeletonFormat: "json",
        atlasPath: "assets/hero/hero.atlas",
        pagePaths: ["assets/hero/hero.png"],
        skins: ["default"],
        animations: ["idle"],
      }),
    );

    const nodeId = dropAssetOntoScene(editor, "asset_spine", { x: 5, y: 6 });
    const node = editor.getScene().nodes.find((n) => n.id === nodeId);
    const spine = node ? getSpine(node) : undefined;
    expect(spine?.assetId).toBe("asset_spine");
    expect(spine?.playing).toBe(true);
    editor.undo();
    expect(editor.getScene().nodes).toHaveLength(0);
  });

  it("dropAssetOntoScene creates an AnimatedSprite for tagged Aseprite assets", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    editor.assets.getDatabase().add(
      createAsepriteAssetRecord({
        id: "asset_hero",
        name: "hero",
        path: "assets/characters/hero.aseprite",
        width: 32,
        height: 48,
        frameCount: 4,
        tags: [{ name: "idle", from: 0, to: 1 }, { name: "run", from: 2, to: 3 }],
      }),
    );
    const nodeId = dropAssetOntoScene(editor, "asset_hero", { x: 4, y: 5 });
    const node = editor.getScene().nodes.find((n) => n.id === nodeId);
    const visual = node ? getAnimatedSprite(node) : undefined;
    expect(visual?.assetId).toBe("asset_hero");
    expect(visual?.animation).toBe("idle");
    expect(visual?.playing).toBe(true);
    expect(visual?.width).toBe(32);
    expect(visual?.height).toBe(48);
    expect(JSON.stringify(editor.getScene())).not.toMatch(/\.generated/);
    editor.undo();
    expect(editor.getScene().nodes).toHaveLength(0);
  });

  it("dropAssetOntoScene creates a Sprite for a single-frame Aseprite asset", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    editor.assets.getDatabase().add(
      createAsepriteAssetRecord({
        id: "asset_icon",
        name: "icon",
        path: "assets/icon.aseprite",
        width: 16,
        height: 16,
        frameCount: 1,
      }),
    );
    const nodeId = dropAssetOntoScene(editor, "asset_icon", { x: 1, y: 2 });
    const node = editor.getScene().nodes.find((n) => n.id === nodeId);
    expect(getSprite(node!)?.assetId).toBe("asset_icon");
    expect(getSprite(node!)?.width).toBe(16);
    expect(getSprite(node!)?.height).toBe(16);
  });

  it("dropAssetOntoScene rejects audio assets", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    editor.assets.getDatabase().add(
      createAudioAssetRecord({
        id: "asset_sfx",
        name: "click",
        path: "assets/click.mp3",
        mimeType: "audio/mpeg",
      }),
    );
    expect(() =>
      dropAssetOntoScene(editor, "asset_sfx", { x: 0, y: 0 }),
    ).toThrow(/Audio assets cannot be dropped/);
  });

  it("dropAssetOntoScene creates a Model3D node for gltf assets", () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    editor.assets.getDatabase().add(
      createGltfAssetRecord({
        id: "asset_model",
        name: "hero",
        path: "assets/hero.glb",
        mimeType: "model/gltf-binary",
        format: "glb",
      }),
    );
    const nodeId = dropAssetOntoScene(editor, "asset_model", { x: 5, y: 6 });
    const node = findNodeById(editor.getScene(), nodeId);
    expect(node?.name).toBe("Hero");
    expect(getModel3D(node!)?.assetId).toBe("asset_model");
    expect(getTransform3D(node!)?.position).toEqual({ x: 5, y: 0, z: 6 });
  });

  it("importDroppedFiles filters unsupported files and reports message", async () => {
    const database: AssetDatabaseData = { version: 1, assets: [] };
    const editor = new Editor({
      scene: createEmptyScene("Test"),
      assetApi: {
        listAssets: vi.fn(async () => ({ database, revision: "a1", folders: ["assets"] })),
        importAssets: vi.fn(async () => ({
          imported: [],
          errors: [],
          database,
          revision: "a1",
          folders: ["assets"],
        })),
        createFolder: vi.fn(async (folderPath: string) => ({
          folder: folderPath,
          folders: ["assets", folderPath],
        })),
        renameAsset: vi.fn(async () => {
          throw new Error("unused");
        }),
        moveAsset: vi.fn(async () => {
          throw new Error("unused");
        }),
        duplicateAsset: vi.fn(async () => {
          throw new Error("unused");
        }),
        restoreAsset: vi.fn(async () => {
          throw new Error("unused");
        }),
        renameFolder: vi.fn(async () => {
          throw new Error("unused");
        }),
        restoreFolder: vi.fn(async () => {
          throw new Error("unused");
        }),
        deleteAsset: vi.fn(async () => {
          throw new Error("unused");
        }),
        deleteFolder: vi.fn(async () => {
          throw new Error("unused");
        }),
        getAssetContentUrl: (id) => `/assets/${id}/content`,
        getAssetPartUrl: (id, part) => `/assets/${id}/part/${part}`,
      },
    });

    const empty = await importDroppedFiles(editor, [
      new File(["x"], "notes.txt", { type: "text/plain" }),
    ]);
    expect(empty.importedCount).toBe(0);
    expect(empty.message).toMatch(/No supported/);
  });

  it("importDroppedFiles rejects the scenes folder", async () => {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    const result = await importDroppedFiles(
      editor,
      [new File(["x"], "hero.png", { type: "image/png" })],
      "assets/scenes",
    );
    expect(result.importedCount).toBe(0);
    expect(result.message).toMatch(/assets\/scenes/);
  });

  it("asset refresh bumps store version without changing document revision", async () => {
    const record = createTextureAssetRecord({
      id: "asset_hero",
      name: "hero",
      path: "assets/hero.png",
      width: 32,
      height: 32,
      mimeType: "image/png",
    });
    const database: AssetDatabaseData = { version: 1, assets: [record] };
    const editor = new Editor({
      scene: createEmptyScene("Test"),
      assetApi: {
        listAssets: vi.fn(async () => ({
          database,
          revision: "rev-1",
          folders: ["assets"],
        })),
        importAssets: vi.fn(async () => ({
          imported: [],
          errors: [],
          database,
          revision: "rev-1",
          folders: ["assets"],
        })),
        createFolder: vi.fn(async (folderPath: string) => ({
          folder: folderPath,
          folders: ["assets", folderPath],
        })),
        renameAsset: vi.fn(async () => {
          throw new Error("unused");
        }),
        moveAsset: vi.fn(async () => {
          throw new Error("unused");
        }),
        duplicateAsset: vi.fn(async () => {
          throw new Error("unused");
        }),
        restoreAsset: vi.fn(async () => {
          throw new Error("unused");
        }),
        renameFolder: vi.fn(async () => {
          throw new Error("unused");
        }),
        restoreFolder: vi.fn(async () => {
          throw new Error("unused");
        }),
        deleteAsset: vi.fn(async () => {
          throw new Error("unused");
        }),
        deleteFolder: vi.fn(async () => {
          throw new Error("unused");
        }),
        getAssetContentUrl: (id) => `/api/assets/${id}/content`,
        getAssetPartUrl: (id, part) => `/api/assets/${id}/part/${part}`,
      },
    });

    const docRevision = editor.getRevision();
    const before = editor.getStoreVersion();
    await editor.assets.refresh();
    expect(editor.getRevision()).toBe(docRevision);
    expect(editor.getStoreVersion()).toBeGreaterThan(before);
    expect(editor.assets.resolveUrl("asset_hero")).toBe(
      "/api/assets/asset_hero/content",
    );

    const afterLoad = editor.getStoreVersion();
    const kept = editor.assets.get("asset_hero");
    await editor.assets.refresh();
    expect(editor.getStoreVersion()).toBe(afterLoad);
    expect(editor.assets.get("asset_hero")).toBe(kept);
  });

  it("moveAsset keeps content URL stable when only the path changes", async () => {
    const record = createTextureAssetRecord({
      id: "asset_hero",
      name: "hero",
      path: "assets/hero.png",
      width: 32,
      height: 32,
      mimeType: "image/png",
    });
    const moved = { ...record, path: "assets/icons/hero.png" };
    const databaseBefore: AssetDatabaseData = { version: 1, assets: [record] };
    const databaseAfter: AssetDatabaseData = { version: 1, assets: [moved] };
    const editor = new Editor({
      scene: createEmptyScene("Test"),
      assetApi: {
        listAssets: vi.fn(async () => ({
          database: databaseBefore,
          revision: "rev-1",
          folders: ["assets"],
        })),
        importAssets: vi.fn(async () => {
          throw new Error("unused");
        }),
        createFolder: vi.fn(async () => {
          throw new Error("unused");
        }),
        renameAsset: vi.fn(async () => {
          throw new Error("unused");
        }),
        moveAsset: vi.fn(async () => ({
          asset: moved,
          database: databaseAfter,
          revision: "rev-2",
          folders: ["assets", "assets/icons"],
        })),
        duplicateAsset: vi.fn(async () => {
          throw new Error("unused");
        }),
        restoreAsset: vi.fn(async () => {
          throw new Error("unused");
        }),
        renameFolder: vi.fn(async () => {
          throw new Error("unused");
        }),
        restoreFolder: vi.fn(async () => {
          throw new Error("unused");
        }),
        deleteAsset: vi.fn(async () => {
          throw new Error("unused");
        }),
        deleteFolder: vi.fn(async () => {
          throw new Error("unused");
        }),
        getAssetContentUrl: (id) => `/api/assets/${id}/content`,
        getAssetPartUrl: (id, part) => `/api/assets/${id}/part/${part}`,
      },
    });

    await editor.assets.refresh();
    const urlBefore = editor.assets.resolveUrl("asset_hero");
    await editor.assets.moveAsset("asset_hero", "assets/icons");
    expect(editor.assets.get("asset_hero")?.path).toBe("assets/icons/hero.png");
    expect(editor.assets.getRevision()).toBe("rev-2");
    expect(editor.assets.resolveUrl("asset_hero")).toBe(urlBefore);
    expect(urlBefore).toBe("/api/assets/asset_hero/content");
  });
});
