import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Plugin } from "vite";
import {
  gameContentPlugin,
  isGeneratedTrashRelative,
} from "./game-content-plugin.js";

function runCloseBundle(plugin: Plugin): void {
  const hook = plugin.closeBundle;
  if (typeof hook !== "function") {
    throw new Error("expected closeBundle function");
  }
  hook.call({} as never);
}

describe("isGeneratedTrashRelative", () => {
  it("matches undo trash folders under .generated", () => {
    expect(isGeneratedTrashRelative("asset-trash")).toBe(true);
    expect(isGeneratedTrashRelative("asset-trash/id/record.json")).toBe(true);
    expect(isGeneratedTrashRelative("folder-trash/assets/ui")).toBe(true);
    expect(isGeneratedTrashRelative("assets/hero.png")).toBe(false);
  });
});

describe("gameContentPlugin", () => {
  it("copies assets and derived files but skips undo trash", () => {
    const gameRoot = mkdtempSync(path.join(tmpdir(), "game-content-"));
    mkdirSync(path.join(gameRoot, "assets", "ui"), { recursive: true });
    mkdirSync(path.join(gameRoot, ".generated", "assets"), { recursive: true });
    mkdirSync(path.join(gameRoot, ".generated", "asset-trash", "id"), {
      recursive: true,
    });
    mkdirSync(path.join(gameRoot, ".generated", "folder-trash", "assets"), {
      recursive: true,
    });
    writeFileSync(path.join(gameRoot, "assets", "ui", "hero.png"), "src");
    writeFileSync(
      path.join(gameRoot, ".generated", "assets", "hero.json"),
      "{}",
    );
    writeFileSync(
      path.join(gameRoot, ".generated", "asset-trash", "id", "record.json"),
      "{}",
    );
    writeFileSync(
      path.join(gameRoot, ".generated", "folder-trash", "assets", "gone.png"),
      "gone",
    );

    runCloseBundle(gameContentPlugin(gameRoot));

    const dist = path.join(gameRoot, "dist");
    expect(existsSync(path.join(dist, "assets", "ui", "hero.png"))).toBe(true);
    expect(existsSync(path.join(dist, "_generated", "assets", "hero.json"))).toBe(
      true,
    );
    expect(existsSync(path.join(dist, ".generated"))).toBe(false);
    expect(existsSync(path.join(dist, ".generated", "asset-trash"))).toBe(false);
    expect(existsSync(path.join(dist, ".generated", "folder-trash"))).toBe(false);
  });
});
