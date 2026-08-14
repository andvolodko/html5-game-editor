import { describe, expect, it } from "vitest";
import {
  createAsepriteAssetRecord,
  createTextureAssetRecord,
  rasterAssetDisplaySize,
} from "./index.js";

describe("rasterAssetDisplaySize", () => {
  it("returns texture and Aseprite cel size, not other kinds", () => {
    expect(
      rasterAssetDisplaySize(
        createTextureAssetRecord({
          name: "hero",
          path: "assets/hero.png",
          width: 64,
          height: 32,
          mimeType: "image/png",
        }),
      ),
    ).toEqual({ width: 64, height: 32 });
    expect(
      rasterAssetDisplaySize(
        createAsepriteAssetRecord({
          name: "puff",
          path: "assets/puff.aseprite",
          width: 16,
          height: 20,
        }),
      ),
    ).toEqual({ width: 16, height: 20 });
  });
});
