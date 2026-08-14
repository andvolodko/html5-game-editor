import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  ASEPRITE_CLI_MISSING_MESSAGE,
  AsepriteService,
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
});
