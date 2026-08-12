import { z } from "zod";
import {
  DEFAULT_PROJECT_RESOLUTION,
  DEFAULT_START_SCENE,
  PROJECT_SCHEMA_VERSION,
  type ProjectData,
  type ProjectResolution,
} from "./types.js";

/** Same allowlist as scene file ids on the project server. */
export const PROJECT_SCENE_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

/** Folder id under the games workspace used to open/switch projects. */
export const PROJECT_ID_PATTERN = PROJECT_SCENE_ID_PATTERN;

export const rendererKindSchema = z.enum(["pixi", "three"]);

export const projectResolutionSchema: z.ZodType<ProjectResolution> = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
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
});

export const projectDataSchema: z.ZodType<ProjectData> = projectDataObjectSchema;

/**
 * Parses project.json. Missing `startScene` / `resolution` on v1 files get defaults.
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

  return projectDataSchema.parse(withDefault);
}

export function isCurrentProjectSchemaVersion(version: number): boolean {
  return version === PROJECT_SCHEMA_VERSION;
}

/** Deterministic JSON for Git-friendly persistence. */
export function serializeProjectData(data: ProjectData): string {
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
  };
  return `${JSON.stringify(normalized, null, 2)}\n`;
}
