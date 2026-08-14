import { describe, expect, it } from "vitest";
import {
  collectDroppedFiles,
  collectFilesFromDroppedEntries,
  droppedFileUploadName,
  droppedFolderPaths,
  type DroppedDirectoryEntry,
  type DroppedFileEntry,
  type DroppedFsEntry,
} from "./collect-dropped-files.js";

function fileEntry(name: string, contents = "png"): DroppedFileEntry {
  return {
    kind: "file",
    name,
    file: async () => new File([contents], name, { type: "image/png" }),
  };
}

function dirEntry(
  name: string,
  children: readonly DroppedFsEntry[],
): DroppedDirectoryEntry {
  return {
    kind: "directory",
    name,
    readEntries: async () => children,
  };
}

describe("collectFilesFromDroppedEntries", () => {
  it("returns loose files", async () => {
    const files = await collectFilesFromDroppedEntries([
      fileEntry("hero.png"),
      fileEntry("icon.png"),
    ]);
    expect(files.map((file) => file.name)).toEqual(["hero.png", "icon.png"]);
    expect(files.map((file) => droppedFileUploadName(file))).toEqual([
      "hero.png",
      "icon.png",
    ]);
  });

  it("expands a dropped folder of pngs", async () => {
    const files = await collectFilesFromDroppedEntries([
      dirEntry("icons", [fileEntry("a.png"), fileEntry("b.png")]),
    ]);
    expect(files.map((file) => file.name)).toEqual(["a.png", "b.png"]);
    expect(files.map((file) => droppedFileUploadName(file))).toEqual([
      "icons/a.png",
      "icons/b.png",
    ]);
  });

  it("walks nested folders", async () => {
    const files = await collectFilesFromDroppedEntries([
      dirEntry("ui", [
        dirEntry("hud", [fileEntry("health.png")]),
        fileEntry("button.png"),
      ]),
    ]);
    expect(files.map((file) => file.name)).toEqual(["health.png", "button.png"]);
    expect(files.map((file) => droppedFileUploadName(file))).toEqual([
      "ui/hud/health.png",
      "ui/button.png",
    ]);
    expect(droppedFolderPaths(files, "assets").sort()).toEqual([
      "assets",
      "assets/ui",
      "assets/ui/hud",
    ]);
  });

  it("returns an empty list for an empty folder", async () => {
    const files = await collectFilesFromDroppedEntries([dirEntry("empty", [])]);
    expect(files).toEqual([]);
  });
});

describe("collectDroppedFiles", () => {
  it("falls back to FileList when no filesystem entries are present", async () => {
    const file = new File(["x"], "hero.png", { type: "image/png" });
    const dataTransfer = {
      items: { length: 0 } as DataTransferItemList,
      files: {
        0: file,
        length: 1,
        item: (index: number) => (index === 0 ? file : null),
        [Symbol.iterator]: function* () {
          yield file;
        },
      },
    } as unknown as DataTransfer;

    const files = await collectDroppedFiles(dataTransfer);
    expect(files).toEqual([file]);
  });

  it("reads pngs from a dropped folder instead of the directory FileList stub", async () => {
    const png = new File(["x"], "hero.png", { type: "image/png" });
    const fileEntry = {
      isFile: true,
      isDirectory: false,
      name: "hero.png",
      file: (success: (file: File) => void) => {
        success(png);
      },
    };
    let issuedBatch = false;
    const directory = {
      isFile: false,
      isDirectory: true,
      name: "icons",
      createReader: () => ({
        readEntries: (success: (batch: typeof fileEntry[]) => void) => {
          if (issuedBatch) {
            success([]);
            return;
          }
          issuedBatch = true;
          success([fileEntry]);
        },
      }),
    };
    const item = {
      kind: "file" as const,
      webkitGetAsEntry: () => directory,
    };
    const folderStub = new File([], "icons");
    const dataTransfer = {
      items: { 0: item, length: 1 },
      files: {
        0: folderStub,
        length: 1,
        item: (index: number) => (index === 0 ? folderStub : null),
        [Symbol.iterator]: function* () {
          yield folderStub;
        },
      },
    } as unknown as DataTransfer;

    const files = await collectDroppedFiles(dataTransfer);
    expect(files.map((file) => file.name)).toEqual(["hero.png"]);
    expect(files.map((file) => droppedFileUploadName(file))).toEqual([
      "icons/hero.png",
    ]);
  });
});
