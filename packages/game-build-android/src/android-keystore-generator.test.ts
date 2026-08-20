import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ProcessRunner } from "@game-editor/game-build";
import { generateLocalUploadKeystore } from "./android-keystore-generator.js";
import { ANDROID_LOCAL_KEYSTORE_RELATIVE } from "./android-constants.js";
import {
  isAndroidSigningSecretsComplete,
  loadAndroidSigningSecrets,
} from "./android-signing-secrets.js";

describe("generateLocalUploadKeystore", () => {
  it("creates a keystore via keytool without putting the password on argv", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "ge-keystore-"));
    const captured: string[][] = [];
    const runner: ProcessRunner = {
      async run(command, args) {
        captured.push([command, ...args]);
        if (args.includes("-genkeypair")) {
          await mkdir(path.join(root, ".editor"), { recursive: true });
          await writeFile(
            path.join(root, ANDROID_LOCAL_KEYSTORE_RELATIVE),
            "fake-keystore",
            "utf8",
          );
        }
        return {
          stdout: "",
          stderr: args.includes("-version")
            ? 'openjdk version "21.0.2"'
            : "",
          exitCode: 0,
        };
      },
    };
    try {
      const result = await generateLocalUploadKeystore({
        projectRoot: root,
        processRunner: runner,
      });
      expect(result.created).toBe(true);
      expect(result.keystorePath).toBe(".editor/upload.p12");
      expect(result.keyAlias).toBe("upload");
      const keytoolArgs = captured.find((line) => line.includes("-genkeypair"));
      expect(keytoolArgs?.some((part) => part.startsWith("-storepass") && part !== "-storepass:file")).toBe(false);
      expect(keytoolArgs).toContain("-storepass:file");
      const secrets = await loadAndroidSigningSecrets(root);
      expect(isAndroidSigningSecretsComplete(secrets)).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reuses an existing keystore when secrets are present", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "ge-keystore-"));
    try {
      await mkdir(path.join(root, ".editor"), { recursive: true });
      await writeFile(
        path.join(root, ANDROID_LOCAL_KEYSTORE_RELATIVE),
        "existing",
        "utf8",
      );
      await writeFile(
        path.join(root, ".editor", "android-secrets.json"),
        `${JSON.stringify({ keystorePassword: "a", keyPassword: "b" })}\n`,
        "utf8",
      );
      const runner: ProcessRunner = {
        async run() {
          throw new Error("keytool should not run");
        },
      };
      const result = await generateLocalUploadKeystore({
        projectRoot: root,
        processRunner: runner,
      });
      expect(result.created).toBe(false);
      expect(result.keystorePath).toBe(".editor/upload.p12");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
