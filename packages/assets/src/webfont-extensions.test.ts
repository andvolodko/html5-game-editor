import { describe, expect, it } from "vitest";
import {
  fontFamilyFromWebFontFileName,
  isSupportedWebFontFile,
  mimeTypeForWebFontFileName,
  webFontFormatFromFileName,
} from "./webfont-extensions.js";

describe("webfont extensions", () => {
  it("detects TTF/OTF/WOFF files", () => {
    expect(isSupportedWebFontFile({ name: "ChaChicle.ttf" })).toBe(true);
    expect(isSupportedWebFontFile({ name: "Lineal.otf" })).toBe(true);
    expect(isSupportedWebFontFile({ name: "Dotrice-Regular.woff" })).toBe(true);
    expect(isSupportedWebFontFile({ name: "Crosterian.woff2" })).toBe(true);
    expect(isSupportedWebFontFile({ name: "desyrel.xml" })).toBe(false);
  });

  it("maps MIME and format from the extension", () => {
    expect(mimeTypeForWebFontFileName("ChaChicle.ttf")).toBe("font/ttf");
    expect(mimeTypeForWebFontFileName("Lineal.otf")).toBe("font/otf");
    expect(mimeTypeForWebFontFileName("Dotrice-Regular.woff")).toBe("font/woff");
    expect(mimeTypeForWebFontFileName("Crosterian.woff2")).toBe("font/woff2");
    expect(webFontFormatFromFileName("Crosterian.woff2")).toBe("woff2");
  });

  it("derives CSS family names from file stems", () => {
    expect(fontFamilyFromWebFontFileName("ChaChicle.ttf")).toBe("ChaChicle");
    expect(fontFamilyFromWebFontFileName("Lineal.otf")).toBe("Lineal");
    expect(fontFamilyFromWebFontFileName("Dotrice-Regular.woff")).toBe(
      "Dotrice Regular",
    );
    expect(fontFamilyFromWebFontFileName("Crosterian.woff2")).toBe("Crosterian");
  });
});
