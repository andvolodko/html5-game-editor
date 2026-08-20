import {
  GENERATED_ASSETS_ROOT,
  toDiskAssetPath,
} from "@game-editor/assets";

/** Keep in sync with `@game-editor/project` PROJECT_ID_PATTERN. */
const PROJECT_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

const DEMO_URL_PREFIX = "/demo/";
const ASSETS_ROOT = "assets";
const GENERATED_TRASH_FOLDERS = ["asset-trash", "folder-trash"] as const;

export interface DemoContentUrl {
  projectId: string;
  /** Project-relative disk path under `assets/` or `.generated/`. */
  relative: string;
}

function normalizeRelative(relative: string): string {
  return relative.replaceAll("\\", "/").replace(/^\/+/, "");
}

function hasTraversalSegment(relative: string): boolean {
  return relative.split("/").some((segment) => segment === ".." || segment === "");
}

function isGeneratedTrashPath(relativeToGenerated: string): boolean {
  return GENERATED_TRASH_FOLDERS.some(
    (folder) =>
      relativeToGenerated === folder || relativeToGenerated.startsWith(`${folder}/`),
  );
}

/** True when a path under `.generated/` is undo trash, not runtime content. */
export function isGeneratedTrashRelative(relativeToGenerated: string): boolean {
  return isGeneratedTrashPath(normalizeRelative(relativeToGenerated));
}

/**
 * Demo hosts may serve only source assets and derived Aseprite output.
 * Public URLs use `_generated/`; on-disk paths stay `.generated/`.
 * Rejects trash, traversal, and anything outside those two trees.
 */
export function isAllowedDemoContentRelative(relative: string): boolean {
  const normalized = normalizeRelative(relative);
  if (hasTraversalSegment(normalized)) {
    return false;
  }
  if (normalized.startsWith(`${ASSETS_ROOT}/`)) {
    return true;
  }
  const diskRelative = toDiskAssetPath(normalized);
  const generatedPrefix = `${GENERATED_ASSETS_ROOT}/`;
  if (!diskRelative.startsWith(generatedPrefix)) {
    return false;
  }
  const afterGenerated = diskRelative.slice(generatedPrefix.length);
  return afterGenerated.length > 0 && !isGeneratedTrashPath(afterGenerated);
}

/** Parses `/demo/<projectId>/assets/...` or `/demo/<projectId>/_generated/...`. */
export function parseDemoContentUrl(pathname: string): DemoContentUrl | undefined {
  if (!pathname.startsWith(DEMO_URL_PREFIX)) {
    return undefined;
  }
  const rest = pathname.slice(DEMO_URL_PREFIX.length);
  const slash = rest.indexOf("/");
  if (slash <= 0) {
    return undefined;
  }
  const projectId = rest.slice(0, slash);
  if (!PROJECT_ID_PATTERN.test(projectId)) {
    return undefined;
  }
  const relative = rest.slice(slash + 1);
  if (!isAllowedDemoContentRelative(relative)) {
    return undefined;
  }
  return { projectId, relative: toDiskAssetPath(normalizeRelative(relative)) };
}
