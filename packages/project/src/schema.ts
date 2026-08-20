import { z } from "zod";
import {
  createDefaultAndroidBuildSettings,
  ANDROID_APPLICATION_ID_PATTERN,
  type AndroidBuildSettings,
} from "./android-build-settings.js";
import {
  DEFAULT_PROJECT_BACKGROUND,
  DEFAULT_PROJECT_RESOLUTION,
  DEFAULT_PROJECT_SCALE_MODE,
  DEFAULT_START_SCENE,
  PROJECT_SCHEMA_VERSION,
  resolveProjectScaleMode,
  type ProjectData,
  type ProjectResolution,
  type ProjectScaleMode,
} from "./types.js";
import {
  normalizeProjectBackgroundHex,
  PROJECT_BACKGROUND_HEX_PATTERN,
} from "./project-background.js";

/** Same allowlist as scene file ids on the project server. */
export const PROJECT_SCENE_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

/** Folder id under the games workspace used to open/switch projects. */
export const PROJECT_ID_PATTERN = PROJECT_SCENE_ID_PATTERN;

export const rendererKindSchema = z.enum(["pixi", "three"]);

export const projectResolutionSchema: z.ZodType<ProjectResolution> = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const projectScaleModeSchema: z.ZodType<ProjectScaleMode> = z.enum([
  "contain",
  "cover",
  "expand",
]);

export const projectBackgroundSchema = z
  .string()
  .regex(PROJECT_BACKGROUND_HEX_PATTERN, "Invalid background hex color");

export const androidOrientationSchema = z.enum([
  "auto",
  "portrait",
  "landscape",
]);

function optionalNonEmptyString(): z.ZodOptional<z.ZodString> {
  return z.string().min(1).optional();
}

export const androidBuildSettingsSchema: z.ZodType<AndroidBuildSettings> =
  z.object({
    appName: z.string().min(1),
    applicationId: z
      .string()
      .regex(
        ANDROID_APPLICATION_ID_PATTERN,
        "Invalid Android application id",
      ),
    versionName: z.string().min(1),
    versionCode: z.number().int().positive(),
    orientation: androidOrientationSchema,
    fullscreen: z.boolean(),
    immersiveMode: z.boolean(),
    keepScreenAwake: z.boolean(),
    keystorePath: optionalNonEmptyString(),
    keyAlias: optionalNonEmptyString(),
    iconAssetId: optionalNonEmptyString(),
    splashAssetId: optionalNonEmptyString(),
  });

const projectDataObjectSchema = z.object({
  name: z.string().min(1),
  version: z.number().int().positive(),
  displayName: z.string().min(1),
  renderers: z.array(rendererKindSchema).min(1),
  startScene: z
    .string()
    .min(1)
    .regex(PROJECT_SCENE_ID_PATTERN, "Invalid startScene id"),
  resolution: projectResolutionSchema,
  scaleMode: projectScaleModeSchema,
  background: projectBackgroundSchema,
  android: androidBuildSettingsSchema.optional(),
});

export const projectDataSchema: z.ZodType<ProjectData> = projectDataObjectSchema;

function optionalStringField(
  value: unknown,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function fillAndroidDefaults(
  record: Record<string, unknown>,
  displayName: string,
  projectName: string,
): AndroidBuildSettings {
  const defaults = createDefaultAndroidBuildSettings(displayName, projectName);
  const raw = record.android;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return defaults;
  }
  const android = raw as Record<string, unknown>;
  return androidBuildSettingsSchema.parse({
    appName:
      typeof android.appName === "string" && android.appName.trim().length > 0
        ? android.appName
        : defaults.appName,
    applicationId:
      typeof android.applicationId === "string" &&
      android.applicationId.trim().length > 0
        ? android.applicationId
        : defaults.applicationId,
    versionName:
      typeof android.versionName === "string" &&
      android.versionName.trim().length > 0
        ? android.versionName
        : defaults.versionName,
    versionCode:
      typeof android.versionCode === "number"
        ? android.versionCode
        : defaults.versionCode,
    orientation:
      android.orientation === "auto" ||
      android.orientation === "portrait" ||
      android.orientation === "landscape"
        ? android.orientation
        : defaults.orientation,
    fullscreen:
      typeof android.fullscreen === "boolean"
        ? android.fullscreen
        : defaults.fullscreen,
    immersiveMode:
      typeof android.immersiveMode === "boolean"
        ? android.immersiveMode
        : defaults.immersiveMode,
    keepScreenAwake:
      typeof android.keepScreenAwake === "boolean"
        ? android.keepScreenAwake
        : defaults.keepScreenAwake,
    keystorePath: optionalStringField(android.keystorePath),
    keyAlias: optionalStringField(android.keyAlias),
    iconAssetId: optionalStringField(android.iconAssetId),
    splashAssetId: optionalStringField(android.splashAssetId),
  });
}

/**
 * Parses project.json. Missing `startScene` / `resolution` / `scaleMode` /
 * `background` on v1 files get defaults. Missing `android` gets defaults
 * from displayName/name.
 */
export function parseProjectData(input: unknown): ProjectData {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return projectDataSchema.parse(input);
  }

  const record = input as Record<string, unknown>;
  const withDefault: Record<string, unknown> = { ...record };
  if (
    !("startScene" in withDefault) ||
    withDefault.startScene === undefined ||
    withDefault.startScene === null
  ) {
    withDefault.startScene = DEFAULT_START_SCENE;
  }
  if (
    !("resolution" in withDefault) ||
    withDefault.resolution === undefined ||
    withDefault.resolution === null
  ) {
    withDefault.resolution = { ...DEFAULT_PROJECT_RESOLUTION };
  }
  if (
    !("scaleMode" in withDefault) ||
    withDefault.scaleMode === undefined ||
    withDefault.scaleMode === null ||
    withDefault.scaleMode === ""
  ) {
    withDefault.scaleMode = DEFAULT_PROJECT_SCALE_MODE;
  }
  if (
    !("background" in withDefault) ||
    withDefault.background === undefined ||
    withDefault.background === null ||
    withDefault.background === ""
  ) {
    withDefault.background = DEFAULT_PROJECT_BACKGROUND;
  } else if (typeof withDefault.background === "string") {
    const normalized = normalizeProjectBackgroundHex(withDefault.background);
    if (normalized) {
      withDefault.background = normalized;
    }
  }

  const name =
    typeof withDefault.name === "string" ? withDefault.name : "game";
  const displayName =
    typeof withDefault.displayName === "string"
      ? withDefault.displayName
      : name;
  withDefault.android = fillAndroidDefaults(withDefault, displayName, name);

  return projectDataSchema.parse(withDefault);
}

export function isCurrentProjectSchemaVersion(version: number): boolean {
  return version === PROJECT_SCHEMA_VERSION;
}

function serializeOptionalField(
  value: string | undefined,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Deterministic JSON for Git-friendly persistence. */
export function serializeProjectData(data: ProjectData): string {
  const background =
    normalizeProjectBackgroundHex(data.background) ??
    DEFAULT_PROJECT_BACKGROUND;
  const android =
    data.android ??
    createDefaultAndroidBuildSettings(data.displayName, data.name);
  const keystorePath = serializeOptionalField(android.keystorePath);
  const keyAlias = serializeOptionalField(android.keyAlias);
  const iconAssetId = serializeOptionalField(android.iconAssetId);
  const splashAssetId = serializeOptionalField(android.splashAssetId);
  const normalized: ProjectData = {
    name: data.name,
    version: data.version,
    displayName: data.displayName,
    renderers: [...data.renderers],
    startScene: data.startScene,
    resolution: {
      width: data.resolution.width,
      height: data.resolution.height,
    },
    scaleMode: resolveProjectScaleMode(data.scaleMode),
    background,
    android: {
      appName: android.appName,
      applicationId: android.applicationId,
      versionName: android.versionName,
      versionCode: android.versionCode,
      orientation: android.orientation,
      fullscreen: android.fullscreen,
      immersiveMode: android.immersiveMode,
      keepScreenAwake: android.keepScreenAwake,
      ...(keystorePath !== undefined ? { keystorePath } : {}),
      ...(keyAlias !== undefined ? { keyAlias } : {}),
      ...(iconAssetId !== undefined ? { iconAssetId } : {}),
      ...(splashAssetId !== undefined ? { splashAssetId } : {}),
    },
  };
  return `${JSON.stringify(normalized, null, 2)}\n`;
}
