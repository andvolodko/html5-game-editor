import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const ANDROID_SECRETS_RELATIVE_PATH = ".editor/android-secrets.json";

export interface AndroidSigningSecrets {
  keystorePassword: string;
  keyPassword: string;
}

export function androidSecretsFilePath(projectRoot: string): string {
  return path.join(projectRoot, ANDROID_SECRETS_RELATIVE_PATH);
}

/**
 * Loads signing passwords from the gitignored local secrets file.
 * Returns undefined when the file is missing. Never logs secret values.
 */
export async function loadAndroidSigningSecrets(
  projectRoot: string,
): Promise<AndroidSigningSecrets | undefined> {
  const filePath = androidSecretsFilePath(projectRoot);
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error(
      "Android signing secrets file is not valid JSON (.editor/android-secrets.json).",
    );
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Android signing secrets file must be a JSON object.");
  }
  const record = parsed as Record<string, unknown>;
  const keystorePassword =
    typeof record.keystorePassword === "string"
      ? record.keystorePassword
      : "";
  const keyPassword =
    typeof record.keyPassword === "string" ? record.keyPassword : "";
  if (keystorePassword.length === 0 || keyPassword.length === 0) {
    return {
      keystorePassword,
      keyPassword,
    };
  }
  return { keystorePassword, keyPassword };
}

export function isAndroidSigningSecretsComplete(
  secrets: AndroidSigningSecrets | undefined,
): secrets is AndroidSigningSecrets {
  return (
    secrets !== undefined &&
    secrets.keystorePassword.trim().length > 0 &&
    secrets.keyPassword.trim().length > 0
  );
}

/**
 * Writes signing passwords under `.editor/` (gitignored). Does not log values.
 */
export async function saveAndroidSigningSecrets(
  projectRoot: string,
  secrets: AndroidSigningSecrets,
): Promise<void> {
  const filePath = androidSecretsFilePath(projectRoot);
  await mkdir(path.dirname(filePath), { recursive: true });
  const payload: AndroidSigningSecrets = {
    keystorePassword: secrets.keystorePassword,
    keyPassword: secrets.keyPassword,
  };
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}
