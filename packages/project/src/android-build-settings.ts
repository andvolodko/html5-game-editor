/** Android-facing project settings persisted in project.json. */

export type AndroidOrientation = "auto" | "portrait" | "landscape";

export interface AndroidBuildSettings {
  appName: string;
  applicationId: string;
  versionName: string;
  versionCode: number;
  orientation: AndroidOrientation;
  fullscreen: boolean;
  immersiveMode: boolean;
  keepScreenAwake: boolean;
  /**
   * Project-relative path to the release keystore (.jks / .keystore).
   * Passwords live in `.editor/android-secrets.json`, never here.
   */
  keystorePath?: string;
  /** Keystore key alias (non-secret). */
  keyAlias?: string;
  /** Optional launcher icon texture assetId. */
  iconAssetId?: string;
  /** Optional splash image texture assetId. */
  splashAssetId?: string;
}

export const DEFAULT_ANDROID_VERSION_NAME = "1.0.0";
export const DEFAULT_ANDROID_VERSION_CODE = 1;
export const DEFAULT_ANDROID_ORIENTATION: AndroidOrientation = "auto";
export const DEFAULT_ANDROID_FULLSCREEN = true;
export const DEFAULT_ANDROID_IMMERSIVE_MODE = true;
export const DEFAULT_ANDROID_KEEP_SCREEN_AWAKE = false;

/** Suggested square source for App Icon (px). Downscaled into mipmaps up to 432. */
export const ANDROID_ICON_RECOMMENDED_SIZE = 1024;

/** Suggested square source for Splash Image (px). Packager resizes to this. */
export const ANDROID_SPLASH_RECOMMENDED_SIZE = 512;

/**
 * Java package / application id: reverse-DNS segments of [A-Za-z][A-Za-z0-9_]*.
 */
export const ANDROID_APPLICATION_ID_PATTERN =
  /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;

/** Sanitize a project folder name into a single Java identifier segment. */
export function sanitizeAndroidApplicationIdSegment(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^[^a-z]+/, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return cleaned.length > 0 ? cleaned : "game";
}

export function defaultAndroidApplicationId(projectName: string): string {
  return `com.gameeditor.${sanitizeAndroidApplicationIdSegment(projectName)}`;
}

export function createDefaultAndroidBuildSettings(
  displayName: string,
  projectName: string,
): AndroidBuildSettings {
  return {
    appName: displayName.trim().length > 0 ? displayName.trim() : projectName,
    applicationId: defaultAndroidApplicationId(projectName),
    versionName: DEFAULT_ANDROID_VERSION_NAME,
    versionCode: DEFAULT_ANDROID_VERSION_CODE,
    orientation: DEFAULT_ANDROID_ORIENTATION,
    fullscreen: DEFAULT_ANDROID_FULLSCREEN,
    immersiveMode: DEFAULT_ANDROID_IMMERSIVE_MODE,
    keepScreenAwake: DEFAULT_ANDROID_KEEP_SCREEN_AWAKE,
  };
}

/** Compare non-secret Android settings for ProjectManager skip-save. */
export function androidBuildSettingsEqual(
  a: AndroidBuildSettings | undefined,
  b: AndroidBuildSettings,
): boolean {
  if (!a) {
    return false;
  }
  return (
    a.appName === b.appName &&
    a.applicationId === b.applicationId &&
    a.versionName === b.versionName &&
    a.versionCode === b.versionCode &&
    a.orientation === b.orientation &&
    a.fullscreen === b.fullscreen &&
    a.immersiveMode === b.immersiveMode &&
    a.keepScreenAwake === b.keepScreenAwake &&
    (a.keystorePath ?? "") === (b.keystorePath ?? "") &&
    (a.keyAlias ?? "") === (b.keyAlias ?? "") &&
    (a.iconAssetId ?? "") === (b.iconAssetId ?? "") &&
    (a.splashAssetId ?? "") === (b.splashAssetId ?? "")
  );
}
