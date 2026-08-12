import { z } from "zod";
import {
  DEFAULT_START_SCENE,
  PROJECT_SCHEMA_VERSION,
  type ProjectData,
} from "./types.js";

/** Same allowlist as scene file ids on the project server. */
export const PROJECT_SCENE_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

/** Folder id under the games workspace used to open/switch projects. */
export const PROJECT_ID_PATTERN = PROJECT_SCENE_ID_PATTERN;

export const rendererKindSchema = z.enum(["pixi", "three"]);

const projectDataObjectSchema = z.object({
  name: z.string().min(1),
  version: z.number().int().positive(),
  displayName: z.string().min(1),
  renderers: z.array(rendererKindSchema).min(1),
  startScene: z
    .string()
    .min(1)
    .regex(PROJECT_SCENE_ID_PATTERN, "Invalid startScene id"),
});

export const projectDataSchema: z.ZodType<ProjectData> = projectDataObjectSchema;

/**
 * Parses project.json. Missing `startScene` on v1 files defaults to `"main"`.
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
  };
  return `${JSON.stringify(normalized, null, 2)}\n`;
}
