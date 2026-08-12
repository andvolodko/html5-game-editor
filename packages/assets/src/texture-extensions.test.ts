import { describe, expect, it } from "vitest";
import { textureFormatFromMimeType } from "./texture-extensions.js";

describe("textureFormatFromMimeType", () => {
  it("maps known texture MIME types to Pixi formats", () => {
    expect(textureFormatFromMimeType("image/png")).toBe("png");
    expect(textureFormatFromMimeType("image/jpeg")).toBe("jpg");
    expect(textureFormatFromMimeType("image/webp")).toBe("webp");
  });

  it("returns undefined for unknown MIME types", () => {
    expect(textureFormatFromMimeType("application/octet-stream")).toBeUndefined();
  });
});
