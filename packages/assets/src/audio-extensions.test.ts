import { describe, expect, it } from "vitest";
import {
  isSupportedAudioExtension,
  isSupportedAudioFile,
  mimeTypeForAudioFileName,
} from "./audio-extensions.js";

describe("audio extensions", () => {
  it("accepts mp3/ogg/wav by extension", () => {
    expect(isSupportedAudioExtension("click.mp3")).toBe(true);
    expect(isSupportedAudioExtension("loop.OGG")).toBe(true);
    expect(isSupportedAudioExtension("hit.wav")).toBe(true);
    expect(isSupportedAudioExtension("notes.txt")).toBe(false);
  });

  it("maps extensions to MIME types", () => {
    expect(mimeTypeForAudioFileName("a.mp3")).toBe("audio/mpeg");
    expect(mimeTypeForAudioFileName("a.ogg")).toBe("audio/ogg");
    expect(mimeTypeForAudioFileName("a.wav")).toBe("audio/wav");
    expect(mimeTypeForAudioFileName("a.bin")).toBe("application/octet-stream");
  });

  it("accepts browser File shapes by MIME when extension is missing", () => {
    expect(isSupportedAudioFile({ name: "clip", type: "audio/mpeg" })).toBe(true);
    expect(isSupportedAudioFile({ name: "clip", type: "audio/ogg" })).toBe(true);
    expect(isSupportedAudioFile({ name: "clip", type: "text/plain" })).toBe(false);
  });
});
