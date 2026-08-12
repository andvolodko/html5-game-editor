import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DomainError, ValidationError } from "@game-editor/core";
import { ProjectService } from "./project-service.js";
import { AssetFolderService } from "./asset-folder-service.js";

describe("AssetFolderService", () => {
  let root = "";
  let service: AssetFolderService;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "game-editor-folders-"));
    await mkdir(path.join(root, "assets"), { recursive: true });
    service = new AssetFolderService(new ProjectService(root));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("lists nested folders including empty ones", async () => {
    await mkdir(path.join(root, "assets", "ui", "buttons"), { recursive: true });
    await writeFile(path.join(root, "assets", "root.png"), "x");

    expect(await service.listFolders()).toEqual([
      "assets",
      "assets/ui",
      "assets/ui/buttons",
    ]);
  });

  it("creates nested folders and rejects invalid names / duplicates", async () => {
    const created = await service.createFolder("assets/symbols/ui");
    expect(created).toBe("assets/symbols/ui");
    expect(await service.listFolders()).toEqual([
      "assets",
      "assets/symbols",
      "assets/symbols/ui",
    ]);

    await expect(service.createFolder("assets/symbols/ui")).rejects.toBeInstanceOf(
      DomainError,
    );
    await expect(service.createFolder("assets/bad/name!")).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});
