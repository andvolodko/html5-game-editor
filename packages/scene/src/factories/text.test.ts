import { describe, expect, it } from "vitest";
import { DEFAULT_TEXT_FONT_FAMILY } from "../defaults.js";
import { applyTextStyleWebFont, createDefaultTextStyle } from "./text.js";

describe("applyTextStyleWebFont", () => {
  it("sets fontAssetId and fontFamily from the catalogue webfont", () => {
    const style = createDefaultTextStyle({ fontSize: 48 });
    const next = applyTextStyleWebFont(style, {
      fontAssetId: "asset_webfont",
      fontFamily: "ChaChicle",
    });
    expect(next.fontAssetId).toBe("asset_webfont");
    expect(next.fontFamily).toBe("ChaChicle");
    expect(next.fontSize).toBe(48);
  });

  it("clears the webfont and restores the default family", () => {
    const style = createDefaultTextStyle({
      fontAssetId: "asset_webfont",
      fontFamily: "ChaChicle",
      fontSize: 48,
    });
    const next = applyTextStyleWebFont(style, undefined);
    expect(next.fontAssetId).toBeUndefined();
    expect("fontAssetId" in next).toBe(false);
    expect(next.fontFamily).toBe(DEFAULT_TEXT_FONT_FAMILY);
    expect(next.fontSize).toBe(48);
  });
});
