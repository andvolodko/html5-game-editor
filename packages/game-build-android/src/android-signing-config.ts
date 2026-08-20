import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AndroidBuildSettings } from "@game-editor/project";
import type { AndroidSigningSecrets } from "./android-signing-secrets.js";

const KEYSTORE_HEADER = `def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

`;

const SIGNING_CONFIGS_RELEASE = `
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }
`;

/**
 * Writes keystore.properties into the generated Android tree and patches
 * app/build.gradle with a release signingConfig. Passwords are not logged.
 */
export async function applyReleaseSigningConfig(args: {
  androidProjectDir: string;
  projectRoot: string;
  settings: AndroidBuildSettings;
  secrets: AndroidSigningSecrets;
}): Promise<void> {
  const { androidProjectDir, projectRoot, settings, secrets } = args;
  const keystorePath = settings.keystorePath?.trim();
  const keyAlias = settings.keyAlias?.trim();
  if (!keystorePath || !keyAlias) {
    throw Object.assign(
      new Error("Release signing requires keystorePath and keyAlias."),
      { code: "SIGNING_FAILED" },
    );
  }

  const absoluteKeystore = path.resolve(projectRoot, keystorePath);
  const storeFileProp = absoluteKeystore.replaceAll("\\", "/");

  const propertiesPath = path.join(androidProjectDir, "keystore.properties");
  const properties = [
    `storeFile=${storeFileProp}`,
    `storePassword=${escapePropertiesValue(secrets.keystorePassword)}`,
    `keyAlias=${escapePropertiesValue(keyAlias)}`,
    `keyPassword=${escapePropertiesValue(secrets.keyPassword)}`,
    "",
  ].join("\n");
  await writeFile(propertiesPath, properties, "utf8");

  const appBuildGradle = path.join(androidProjectDir, "app", "build.gradle");
  const gradle = await readFile(appBuildGradle, "utf8");
  await writeFile(
    appBuildGradle,
    patchAppBuildGradleForReleaseSigning(gradle),
    "utf8",
  );
}

/**
 * Injects signingConfigs.release and wires buildTypes.release to it.
 * Idempotent; also heals a previous patch that nested signingConfig inside
 * signingConfigs.release (AGP has no signingConfig() method there).
 */
export function patchAppBuildGradleForReleaseSigning(gradle: string): string {
  let next = gradle;
  if (!next.includes("keystorePropertiesFile")) {
    next = KEYSTORE_HEADER + next;
  }
  next = stripMisplacedSigningConfigFromSigningConfigs(next);
  if (!/signingConfigs\s*\{/.test(next)) {
    if (!/android\s*\{/.test(next)) {
      throw Object.assign(
        new Error("Could not find android { block in app/build.gradle"),
        { code: "SIGNING_FAILED" },
      );
    }
    next = next.replace(/android\s*\{/, `android {${SIGNING_CONFIGS_RELEASE}`);
  }
  if (!hasBuildTypesReleaseSigningConfig(next)) {
    if (!/buildTypes\s*\{[\s\S]*?release\s*\{/.test(next)) {
      throw Object.assign(
        new Error("Could not find buildTypes.release in app/build.gradle"),
        { code: "SIGNING_FAILED" },
      );
    }
    next = next.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{)/,
      `$1\n            signingConfig signingConfigs.release`,
    );
  }
  return next;
}

function hasBuildTypesReleaseSigningConfig(gradle: string): boolean {
  return /buildTypes\s*\{[\s\S]*?release\s*\{[^}]*signingConfig\s+signingConfigs\.release/.test(
    gradle,
  );
}

function stripMisplacedSigningConfigFromSigningConfigs(gradle: string): string {
  // Only the first child of signingConfigs.release — do not scan into buildTypes.
  return gradle.replace(
    /(signingConfigs\s*\{\s*release\s*\{)\s*signingConfig\s+signingConfigs\.release\s*\n?/,
    "$1\n",
  );
}

function escapePropertiesValue(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r");
}
