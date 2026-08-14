import { describe, expect, it } from "vitest";
import {
  AssetDatabase,
  createAsepriteAssetRecord,
  createTextureAssetRecord,
  humanizeAssetNodeName,
  parseAssetDatabase,
  parseAssetRecord,
  serializeAssetDatabase,
  computeAssetDatabaseRevision,
  isSupportedTextureExtension,
  isSupportedTextureFile,
} from "./index.js";

describe("AssetDatabase", () => {
  it("supports get/add/remove/resolvePath/findByPath", () => {
    const db = new AssetDatabase();
    const record = createTextureAssetRecord({
      name: "wild",
      path: "assets/symbols/wild.png",
      width: 128,
      height: 128,
      mimeType: "image/png",
    });

    db.add(record);
    expect(db.get(record.id)).toEqual(record);
    expect(db.resolvePath(record.id)).toBe("assets/symbols/wild.png");
    expect(db.findByPath("assets/symbols/wild.png")?.id).toBe(record.id);
    expect(db.remove(record.id)).toBe(true);
    expect(db.get(record.id)).toBeUndefined();
    expect(db.findByPath("assets/symbols/wild.png")).toBeUndefined();
  });

  it("rejects duplicate ids and paths", () => {
    const db = new AssetDatabase();
    const record = createTextureAssetRecord({
      id: "asset_fixed",
      name: "a",
      path: "assets/a.png",
      width: 1,
      height: 1,
      mimeType: "image/png",
    });
    db.add(record);
    expect(() => db.add({ ...record, path: "assets/b.png" })).toThrow(/duplicate/);
    expect(() =>
      db.add(
        createTextureAssetRecord({
          name: "b",
          path: "assets/a.png",
          width: 1,
          height: 1,
          mimeType: "image/png",
        }),
      ),
    ).toThrow(/duplicate asset path/);
  });

  it("serializes deterministically by asset id", () => {
    const db = new AssetDatabase();
    db.add(
      createTextureAssetRecord({
        id: "asset_b",
        name: "b",
        path: "assets/b.png",
        width: 2,
        height: 2,
        mimeType: "image/png",
      }),
    );
    db.add(
      createTextureAssetRecord({
        id: "asset_a",
        name: "a",
        path: "assets/a.png",
        width: 1,
        height: 1,
        mimeType: "image/png",
      }),
    );

    const json = serializeAssetDatabase(db.toJSON());
    const parsed = parseAssetDatabase(JSON.parse(json));
    expect(parsed.assets.map((a) => a.id)).toEqual(["asset_a", "asset_b"]);
  });

  it("rejects type/metadata.kind mismatch", () => {
    expect(() =>
      parseAssetRecord({
        id: "asset_x",
        type: "texture",
        name: "x",
        path: "assets/x.png",
        metadata: { kind: "audio", mimeType: "audio/mpeg" },
      }),
    ).toThrow();
  });

  it("computes stable revisions that change with content", () => {
    const a = {
      version: 1,
      assets: [
        createTextureAssetRecord({
          id: "asset_a",
          name: "a",
          path: "assets/a.png",
          width: 1,
          height: 1,
          mimeType: "image/png",
        }),
      ],
    };
    const b = {
      version: 1,
      assets: [
        createTextureAssetRecord({
          id: "asset_a",
          name: "a",
          path: "assets/a.png",
          width: 2,
          height: 2,
          mimeType: "image/png",
        }),
      ],
    };
    expect(computeAssetDatabaseRevision(a)).toBe(computeAssetDatabaseRevision(a));
    expect(computeAssetDatabaseRevision(a)).not.toBe(computeAssetDatabaseRevision(b));
  });

  it("shares texture extension helpers", () => {
    expect(isSupportedTextureExtension("foo.PNG")).toBe(true);
    expect(isSupportedTextureExtension("foo.txt")).toBe(false);
    expect(isSupportedTextureFile({ name: "x.webp", type: "" })).toBe(true);
    expect(isSupportedTextureFile({ name: "x.bin", type: "image/png" })).toBe(true);
  });

  it("humanizes node names from asset names", () => {
    expect(humanizeAssetNodeName("wild.png")).toBe("Wild");
    expect(humanizeAssetNodeName("scatter")).toBe("Scatter");
  });

  it("round-trips a spine asset record", () => {
    const record = {
      id: "asset_spine",
      type: "spine" as const,
      name: "hero",
      path: "assets/hero/hero.json",
      metadata: {
        kind: "spine" as const,
        skeletonFormat: "json" as const,
        atlasPath: "assets/hero/hero.atlas",
        pagePaths: ["assets/hero/hero.png"],
        skins: ["default"],
        animations: ["idle"],
      },
    };
    const parsed = parseAssetRecord(record);
    expect(parsed.type).toBe("spine");
    expect(parsed.metadata.kind).toBe("spine");
  });

  it("round-trips an aseprite asset record", () => {
    const record = createAsepriteAssetRecord({
      id: "asset_ase",
      name: "hero",
      path: "assets/characters/hero.aseprite",
      width: 32,
      height: 32,
      frameCount: 4,
      tags: [{ name: "idle", from: 0, to: 1, direction: "forward" }],
      frameDurations: [100, 100, 100, 100],
    });
    const parsed = parseAssetRecord(record);
    expect(parsed.type).toBe("aseprite");
    expect(parsed.metadata.kind).toBe("aseprite");
    if (parsed.metadata.kind === "aseprite") {
      expect(parsed.metadata.tags[0]?.name).toBe("idle");
      expect(parsed.metadata.sheetPath).toBe(".generated/assets/characters/hero.png");
    }
  });

  it("applySnapshot preserves unchanged record identity", () => {
    const db = new AssetDatabase();
    db.add(
      createTextureAssetRecord({
        id: "asset_keep",
        name: "keep",
        path: "assets/keep.png",
        width: 1,
        height: 1,
        mimeType: "image/png",
      }),
    );
    db.add(
      createTextureAssetRecord({
        id: "asset_gone",
        name: "gone",
        path: "assets/gone.png",
        width: 1,
        height: 1,
        mimeType: "image/png",
      }),
    );
    const kept = db.get("asset_keep")!;

    const changed = db.applySnapshot({
      version: 1,
      assets: [
        {
          id: "asset_keep",
          type: "texture",
          name: "keep",
          path: "assets/keep.png",
          metadata: {
            kind: "texture",
            width: 1,
            height: 1,
            mimeType: "image/png",
          },
        },
        createTextureAssetRecord({
          id: "asset_new",
          name: "new",
          path: "assets/new.png",
          width: 2,
          height: 2,
          mimeType: "image/png",
        }),
      ],
    });

    expect(changed).toBe(true);
    expect(db.get("asset_keep")).toBe(kept);
    expect(db.get("asset_gone")).toBeUndefined();
    expect(db.get("asset_new")?.path).toBe("assets/new.png");
    expect(db.applySnapshot(db.toJSON())).toBe(false);
    expect(db.get("asset_keep")).toBe(kept);
  });
});