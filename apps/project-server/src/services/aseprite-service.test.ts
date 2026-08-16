import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  ASEPRITE_CLI_MISSING_MESSAGE,
  AsepriteService,
  PACKAGED_LIBRESPRITE_CLI_PATH_FILE,
  PACKAGED_LIBRESPRITE_DIR,
  PathAsepriteExecutableLookup,
  type AsepriteExecutableLookup,
} from "./aseprite-service.js";
import { DomainError } from "@game-editor/core";

describe("AsepriteService", () => {
  it("reports unavailable without throwing when the executable is missing", async () => {
    const lookup: AsepriteExecutableLookup = {
      resolve: async () => undefined,
    };
    const service = new AsepriteService(lookup, {
      run: async () => ({ stdout: "", stderr: "" }),
    });
    expect(await service.isAvailable()).toBe(false);
    await expect(
      service.exportSheet("in.aseprite", "out.png", "out.json"),
    ).rejects.toBeInstanceOf(DomainError);
    await expect(
      service.exportSheet("in.aseprite", "out.png", "out.json"),
    ).rejects.toThrow(ASEPRITE_CLI_MISSING_MESSAGE);
  });

  it("resolves ASEPRITE env to a LibreSprite or Aseprite executable path", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "aseprite-lookup-"));
    const executable = path.join(dir, "libresprite.exe");
    await writeFile(executable, "");
    vi.stubEnv("ASEPRITE", executable);
    try {
      const lookup = new PathAsepriteExecutableLookup();
      expect(await lookup.resolve()).toBe(executable);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("resolves a packaged LibreSprite executable from vendor/cli-path", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "aseprite-packaged-"));
    const vendor = path.join(root, ...PACKAGED_LIBRESPRITE_DIR.split("/"));
    const nested = path.join(vendor, "bin");
    await mkdir(nested, { recursive: true });
    const executable = path.join(nested, "libresprite.exe");
    await writeFile(executable, "");
    await writeFile(path.join(vendor, PACKAGED_LIBRESPRITE_CLI_PATH_FILE), "bin/libresprite.exe\n");
    const lookup = new PathAsepriteExecutableLookup({
      packageRoot: root,
      skipPath: true,
      skipWellKnown: true,
    });
    expect(await lookup.resolve()).toBe(executable);
  });

  it("ignores a packaged cli-path that escapes vendor/", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "aseprite-escape-"));
    const vendor = path.join(root, ...PACKAGED_LIBRESPRITE_DIR.split("/"));
    await mkdir(vendor, { recursive: true });
    const outside = path.join(root, "outside.exe");
    await writeFile(outside, "");
    await writeFile(path.join(vendor, PACKAGED_LIBRESPRITE_CLI_PATH_FILE), "../../outside.exe\n");
    const lookup = new PathAsepriteExecutableLookup({
      packageRoot: root,
      skipPath: true,
      skipWellKnown: true,
    });
    expect(await lookup.resolve()).toBeUndefined();
  });
});
