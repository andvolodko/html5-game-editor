/** Shared audio extension / MIME helpers used by editor and project-server. */

import { getFileExtension } from "./texture-extensions.js";

export const AUDIO_FILE_EXTENSIONS = [".mp3", ".ogg", ".wav"] as const;

export type AudioFileExtension = (typeof AUDIO_FILE_EXTENSIONS)[number];

const AUDIO_EXTENSION_SET = new Set<string>(AUDIO_FILE_EXTENSIONS);

const MIME_BY_EXT: Record<AudioFileExtension, string> = {
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
};

export function isSupportedAudioExtension(fileName: string): boolean {
  return AUDIO_EXTENSION_SET.has(getFileExtension(fileName));
}

export function mimeTypeForAudioFileName(fileName: string): string {
  const ext = getFileExtension(fileName);
  if (ext in MIME_BY_EXT) {
    return MIME_BY_EXT[ext as AudioFileExtension];
  }
  return "application/octet-stream";
}

/** Browser File filter (name + MIME). */
export function isSupportedAudioFile(file: {
  name: string;
  type?: string;
}): boolean {
  if (isSupportedAudioExtension(file.name)) {
    return true;
  }
  const type = file.type ?? "";
  return (
    type === "audio/mpeg" ||
    type === "audio/mp3" ||
    type === "audio/ogg" ||
    type === "audio/wav" ||
    type === "audio/wave" ||
    type === "audio/x-wav"
  );
}
