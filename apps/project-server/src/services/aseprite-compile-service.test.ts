import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AssetDatabase, createAsepriteAssetRecord } from "@game-editor/assets";
import { ProjectService } from "./project-service.js";
import { AsepriteCacheStore } from "./aseprite-cache.js";
import {
  AsepriteCompileService,
  type AsepriteExporter,
} from "./aseprite-compile-service.js";
import { ASEPRITE_CLI_MISSING_MESSAGE } from "./aseprite-service.js";

const CLI_JSON = {
  frames: [
    {
      filename: "hero 0.aseprite",
      frame: { x: 0, y: 0, w: 8, h: 8 },
      duration: 100,
    },
    {
      filename: "hero 1.aseprite",
      frame: { x: 8, y: 0, w: 8, h: 8 },
      duration: 120,
    },
  ],
  meta: {
    image: "hero.png",
    size: { w: 16, h: 8 },
    frameTags: [{ name: "idle", from: 0, to: 1, direction: "forward" }],
  },
};

function tinyPng(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
}

class FakeAseprite implements AsepriteExporter {
  exports = 0;
  available = true;

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async exportSheet(
    _sourcePath: string,
    sheetPath: string,
    dataPath: string,
  ): Promise<void> {
    this.exports += 1;
    await mkdir(path.dirname(sheetPath), { recursive: true });
    await writeFile(sheetPath, tinyPng());
    await writeFile(dataPath, JSON.stringify(CLI_JSON));
  }
}

describe("AsepriteCompileService", () => {
  let root = "";
  let project: ProjectService;
  let fake: FakeAseprite;
  let compile: AsepriteCompileService;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "game-editor-aseprite-"));
    await mkdir(path.join(root, "assets"), { recursive: true });
    project = new ProjectService(root);
    fake = new FakeAseprite();
    compile = new AsepriteCompileService(
      project,
      fake,
      new AsepriteCacheStore(project),
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("skips rebuild when source mtime and size are unchanged", async () => {
    const sourceRelative = "assets/hero.aseprite";
    await writeFile(path.join(root, sourceRelative), "ase-bytes");
    const record = createAsepriteAssetRecord({
      id: "asset_hero",
      name: "hero",
      path: sourceRelative,
    });

    const first = await compile.ensureCompiled(record);
    expect(fake.exports).toBe(1);
    expect(first.record.metadata.kind).toBe("aseprite");
    if (first.record.metadata.kind === "aseprite") {
      expect(first.record.metadata.tags.map((tag) => tag.name)).toEqual(["idle"]);
      expect(first.record.metadata.frameCount).toBe(2);
      expect(first.record.metadata.frameDurations).toEqual([100, 120]);
      expect(first.record.metadata.compileError).toBeUndefined();
    }

    const second = await compile.ensureCompiled(first.record);
    expect(fake.exports).toBe(1);
    expect(second.record).toBe(first.record);
  });

  it("rebuilds when the source mtime changes", async () => {
    const sourceRelative = "assets/hero.aseprite";
    const absolute = path.join(root, sourceRelative);
    await writeFile(absolute, "ase-bytes");
    const record = createAsepriteAssetRecord({
      id: "asset_hero",
      name: "hero",
      path: sourceRelative,
    });
    const first = await compile.ensureCompiled(record);
    const later = new Date(Date.now() + 2_000);
    await utimes(absolute, later, later);
    await compile.ensureCompiled(first.record);
    expect(fake.exports).toBe(2);
  });

  it("does not crash when the CLI is missing", async () => {
    fake.available = false;
    const sourceRelative = "assets/hero.aseprite";
    await writeFile(path.join(root, sourceRelative), "ase-bytes");
    const database = new AssetDatabase();
    database.add(
      createAsepriteAssetRecord({
        id: "asset_hero",
        name: "hero",
        path: sourceRelative,
      }),
    );
    const result = await compile.processDatabase(database);
    expect(result.changed).toBe(true);
    expect(result.errors[0]?.message).toBe(ASEPRITE_CLI_MISSING_MESSAGE);
    const stored = database.get("asset_hero");
    expect(stored?.metadata.kind).toBe("aseprite");
    if (stored?.metadata.kind === "aseprite") {
      expect(stored.metadata.compileError).toBe(ASEPRITE_CLI_MISSING_MESSAGE);
    }
    expect(fake.exports).toBe(0);
  });
});
