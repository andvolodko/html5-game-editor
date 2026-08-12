/** Shared glTF / GLB extension / MIME helpers used by editor and project-server. */

import { getFileBasename, getFileExtension } from "./texture-extensions.js";
import type { AssetRecord } from "./types.js";
import { normalizeProjectRelativePath } from "./factories.js";

export const GLTF_FILE_EXTENSIONS = [".glb", ".gltf"] as const;

export type GltfFileExtension = (typeof GLTF_FILE_EXTENSIONS)[number];

const GLTF_EXTENSION_SET = new Set<string>(GLTF_FILE_EXTENSIONS);

const MIME_BY_EXT: Record<GltfFileExtension, string> = {
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
};

export function isSupportedGltfExtension(fileName: string): boolean {
  return GLTF_EXTENSION_SET.has(getFileExtension(fileName));
}

/** Single-file GLB. */
export function isSupportedGlbExtension(fileName: string): boolean {
  return getFileExtension(fileName) === ".glb";
}

export function isSupportedGltfJsonExtension(fileName: string): boolean {
  return getFileExtension(fileName) === ".gltf";
}

export function mimeTypeForGltfFileName(fileName: string): string {
  const ext = getFileExtension(fileName);
  if (ext in MIME_BY_EXT) {
    return MIME_BY_EXT[ext as GltfFileExtension];
  }
  return "application/octet-stream";
}

export function gltfFormatFromFileName(fileName: string): "glb" | "gltf" {
  return getFileExtension(fileName) === ".gltf" ? "gltf" : "glb";
}

/** Browser File filter — GLB or .gltf JSON. */
export function isSupportedGltfFile(file: {
  name: string;
  type?: string;
}): boolean {
  if (isSupportedGltfExtension(file.name)) {
    return true;
  }
  const type = file.type ?? "";
  if (type === "model/gltf-binary" || type === "model/gltf+json") {
    return true;
  }
  return type === "application/octet-stream" && isSupportedGlbExtension(file.name);
}

/**
 * Collect relative buffer/image URIs from a glTF JSON document.
 * Skips data: URIs and absolute http(s) URLs.
 */
export function collectGltfExternalUris(gltfJson: unknown): string[] {
  if (typeof gltfJson !== "object" || gltfJson === null) {
    return [];
  }
  const root = gltfJson as Record<string, unknown>;
  const uris: string[] = [];
  const pushUri = (value: unknown) => {
    if (typeof value !== "string" || value.length === 0) {
      return;
    }
    if (value.startsWith("data:") || /^[a-z]+:\/\//i.test(value)) {
      return;
    }
    uris.push(value.replace(/\\/g, "/"));
  };
  for (const key of ["buffers", "images"] as const) {
    const list = root[key];
    if (!Array.isArray(list)) {
      continue;
    }
    for (const entry of list) {
      if (typeof entry === "object" && entry !== null && "uri" in entry) {
        pushUri((entry as { uri: unknown }).uri);
      }
    }
  }
  return [...new Set(uris)];
}

export function parseGltfJsonBytes(bytes: Uint8Array): unknown {
  const text = new TextDecoder("utf8").decode(bytes);
  return JSON.parse(text) as unknown;
}

const GLB_MAGIC = 0x46546c67;
const GLB_CHUNK_JSON = 0x4e4f534a;

/**
 * Parse the JSON chunk from a GLB container (glTF 2.0 binary).
 */
export function parseGlbJson(bytes: Uint8Array): unknown {
  if (bytes.byteLength < 12) {
    throw new Error("GLB too short");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== GLB_MAGIC) {
    throw new Error("Not a GLB file");
  }
  let offset = 12;
  while (offset + 8 <= bytes.byteLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    offset += 8;
    if (offset + chunkLength > bytes.byteLength) {
      throw new Error("GLB chunk truncated");
    }
    if (chunkType === GLB_CHUNK_JSON) {
      return parseGltfJsonBytes(bytes.subarray(offset, offset + chunkLength));
    }
    offset += chunkLength;
  }
  throw new Error("GLB missing JSON chunk");
}

/**
 * Animation clip names from a glTF JSON document (Inspector dropdowns).
 * Unnamed clips use `animation_${index}` to match Three.js GLTFLoader.
 */
export function extractGltfAnimationNames(gltfJson: unknown): string[] {
  if (typeof gltfJson !== "object" || gltfJson === null) {
    return [];
  }
  const list = (gltfJson as Record<string, unknown>).animations;
  if (!Array.isArray(list)) {
    return [];
  }
  const names: string[] = [];
  for (let index = 0; index < list.length; index += 1) {
    const entry = list[index];
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const name = (entry as { name?: unknown }).name;
    if (typeof name === "string" && name.length > 0) {
      names.push(name);
    } else {
      names.push(`animation_${index}`);
    }
  }
  return names;
}

/** Extract animation names from GLB or .gltf JSON bytes. */
export function extractGltfAnimationNamesFromBytes(
  bytes: Uint8Array,
  format: "glb" | "gltf",
): string[] {
  const json = format === "glb" ? parseGlbJson(bytes) : parseGltfJsonBytes(bytes);
  return extractGltfAnimationNames(json);
}

export function isAllowedGltfPartName(part: string): boolean {
  if (part.length === 0 || part.includes("..") || part.includes("/") || part.includes("\\")) {
    return false;
  }
  return true;
}

/** Owned files for a glTF record (primary + buffers + images). */
export function ownedGltfPaths(record: AssetRecord): string[] {
  if (record.metadata.kind !== "gltf") {
    return [record.path];
  }
  const paths = [record.path];
  if (record.metadata.bufferPaths) {
    paths.push(...record.metadata.bufferPaths);
  }
  if (record.metadata.imagePaths) {
    paths.push(...record.metadata.imagePaths);
  }
  return paths.map(normalizeProjectRelativePath);
}

export function resolveGltfPartRelativePath(
  record: AssetRecord,
  part: string,
): string | undefined {
  if (record.metadata.kind !== "gltf" || !isAllowedGltfPartName(part)) {
    return undefined;
  }
  const wanted = part.toLowerCase();
  const candidates = ownedGltfPaths(record);
  return candidates.find(
    (assetPath) => getFileBasename(assetPath).toLowerCase() === wanted,
  );
}

export function mimeTypeForGltfPart(fileName: string): string {
  const ext = getFileExtension(fileName);
  if (ext === ".bin") {
    return "application/octet-stream";
  }
  if (ext === ".png") {
    return "image/png";
  }
  if (ext === ".jpg" || ext === ".jpeg") {
    return "image/jpeg";
  }
  if (ext === ".webp") {
    return "image/webp";
  }
  if (ext === ".gltf") {
    return "model/gltf+json";
  }
  if (ext === ".glb") {
    return "model/gltf-binary";
  }
  return "application/octet-stream";
}
