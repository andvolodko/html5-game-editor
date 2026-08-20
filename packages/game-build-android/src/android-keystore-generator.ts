import { randomBytes } from "node:crypto";
import { access, constants, mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ProcessRunner } from "@game-editor/game-build";
import {
  ANDROID_LOCAL_KEY_ALIAS,
  ANDROID_LOCAL_KEYSTORE_RELATIVE,
} from "./android-constants.js";
import {
  isAndroidSigningSecretsComplete,
  loadAndroidSigningSecrets,
  saveAndroidSigningSecrets,
} from "./android-signing-secrets.js";
import { javaExecutable, locateJdk } from "./android-toolchain.js";

export interface GenerateLocalKeystoreResult {
  keystorePath: string;
  keyAlias: string;
  created: boolean;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function keytoolExecutable(javaHome: string): string {
  return path.join(
    path.dirname(javaExecutable(javaHome)),
    process.platform === "win32" ? "keytool.exe" : "keytool",
  );
}

function randomPassword(): string {
  return randomBytes(18).toString("base64url");
}

/**
 * Creates a gitignored PKCS12 upload keystore for local Play-style release
 * builds. Never logs passwords. Does not overwrite an existing keystore.
 */
export async function generateLocalUploadKeystore(args: {
  projectRoot: string;
  processRunner: ProcessRunner;
  distinguishedName?: string;
}): Promise<GenerateLocalKeystoreResult> {
  const keystoreRel = ANDROID_LOCAL_KEYSTORE_RELATIVE.replaceAll("\\", "/");
  const keystoreAbs = path.join(args.projectRoot, ANDROID_LOCAL_KEYSTORE_RELATIVE);
  const alias = ANDROID_LOCAL_KEY_ALIAS;

  if (await pathExists(keystoreAbs)) {
    const secrets = await loadAndroidSigningSecrets(args.projectRoot);
    if (!isAndroidSigningSecretsComplete(secrets)) {
      throw Object.assign(
        new Error(
          `Keystore already exists at ${keystoreRel}, but local passwords are missing. Enter passwords in Project Settings or delete the keystore to generate a new one.`,
        ),
        { code: "SIGNING_SECRETS_MISSING" },
      );
    }
    return { keystorePath: keystoreRel, keyAlias: alias, created: false };
  }

  const jdk = await locateJdk(args.processRunner);
  if (!jdk.javaHome) {
    throw Object.assign(
      new Error(
        jdk.detail ??
          "JDK 21+ is required to generate a keystore (keytool).",
      ),
      { code: "JDK_NOT_FOUND" },
    );
  }
  const keytool = keytoolExecutable(jdk.javaHome);
  if (!(await pathExists(keytool))) {
    throw Object.assign(
      new Error(`keytool was not found next to the JDK at ${jdk.javaHome}`),
      { code: "JDK_NOT_FOUND" },
    );
  }

  const password = randomPassword();
  await mkdir(path.dirname(keystoreAbs), { recursive: true });
  const passFile = path.join(path.dirname(keystoreAbs), ".keystore-pass");
  await writeFile(passFile, password, "utf8");
  try {
    await args.processRunner.run(
      keytool,
      [
        "-genkeypair",
        "-noprompt",
        "-alias",
        alias,
        "-keyalg",
        "RSA",
        "-keysize",
        "2048",
        "-validity",
        "10000",
        "-storetype",
        "PKCS12",
        "-keystore",
        keystoreAbs,
        "-storepass:file",
        passFile,
        "-keypass:file",
        passFile,
        "-dname",
        args.distinguishedName ??
          "CN=Local Upload, OU=Dev, O=GameEditor, C=US",
      ],
      { env: { ...process.env, JAVA_HOME: jdk.javaHome } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw Object.assign(
      new Error(
        `Failed to generate a local upload keystore with keytool.\n\nCause:\n${message}`,
      ),
      { code: "SIGNING_FAILED" },
    );
  } finally {
    await unlink(passFile).catch(() => undefined);
  }

  await saveAndroidSigningSecrets(args.projectRoot, {
    keystorePassword: password,
    keyPassword: password,
  });

  return { keystorePath: keystoreRel, keyAlias: alias, created: true };
}
