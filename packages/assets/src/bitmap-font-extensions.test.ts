import { describe, expect, it } from "vitest";
import {
  isBitmapFontImportFile,
  mimeTypeForBitmapFontDescriptor,
  parseBitmapFontDescriptor,
  resolveBitmapFontPartRelativePath,
  isAllowedBitmapFontPartName,
} from "./bitmap-font-extensions.js";
import { createBitmapFontAssetRecord } from "./factories.js";
import { ownedAssetPaths, ownedBundleFolder, relocateOwnedAssetPaths } from "./spine-extensions.js";

const DESYREL_XML = `<font>
    <info face="Desyrel" size="70" bold="0" italic="0"/>
    <common lineHeight="87" base="61" scaleW="512" scaleH="512" pages="1"/>
    <pages>
        <page id="0" file="desyrel.png"/>
    </pages>
    <chars count="1">
        <char id="65" x="0" y="0" width="10" height="10" xoffset="0" yoffset="0" xadvance="10" page="0" letter="A"/>
    </chars>
</font>
`;

const TEXT_FNT = `info face="DemoFont" size=32
common lineHeight=36 base=26
page id=0 file="demo.png"
chars count=1
char id=65 x=0 y=0 width=8 height=8 xoffset=0 yoffset=0 xadvance=8 page=0
`;

describe("bitmap font extensions", () => {
  it("detects import files", () => {
    expect(isBitmapFontImportFile({ name: "desyrel.xml" })).toBe(true);
    expect(isBitmapFontImportFile({ name: "desyrel.fnt" })).toBe(true);
    expect(isBitmapFontImportFile({ name: "desyrel.png" })).toBe(false);
  });

  it("parses AngelCode XML face and page files", () => {
    expect(parseBitmapFontDescriptor(DESYREL_XML)).toEqual({
      fontFamily: "Desyrel",
      pageNames: ["desyrel.png"],
    });
  });

  it("parses text BMFont face and page files", () => {
    expect(parseBitmapFontDescriptor(TEXT_FNT)).toEqual({
      fontFamily: "DemoFont",
      pageNames: ["demo.png"],
    });
  });

  it("rejects unrelated XML", () => {
    expect(parseBitmapFontDescriptor("<note>hello</note>")).toBeUndefined();
  });

  it("relocates owned bundle paths and resolves allowlisted parts", () => {
    const record = createBitmapFontAssetRecord({
      id: "asset_font",
      name: "desyrel",
      path: "assets/fonts/desyrel/desyrel.xml",
      fontFamily: "Desyrel",
      pagePaths: ["assets/fonts/desyrel/desyrel.png"],
    });
    expect(ownedAssetPaths(record)).toEqual([
      "assets/fonts/desyrel/desyrel.xml",
      "assets/fonts/desyrel/desyrel.png",
    ]);
    expect(ownedBundleFolder(record)).toBe("assets/fonts/desyrel");
    const moved = relocateOwnedAssetPaths(
      record,
      "assets/fonts/desyrel",
      "assets/fonts/title",
    );
    expect(moved.path).toBe("assets/fonts/title/desyrel.xml");
    expect(moved.metadata.kind === "font" && moved.metadata.pagePaths).toEqual([
      "assets/fonts/title/desyrel.png",
    ]);
    expect(resolveBitmapFontPartRelativePath(record, "desyrel.png")).toBe(
      "assets/fonts/desyrel/desyrel.png",
    );
    expect(resolveBitmapFontPartRelativePath(record, "desyrel.xml")).toBeUndefined();
    expect(resolveBitmapFontPartRelativePath(record, "../secret")).toBeUndefined();
    expect(isAllowedBitmapFontPartName("desyrel.png")).toBe(true);
    expect(isAllowedBitmapFontPartName("..")).toBe(false);
  });

  it("picks XML MIME for descriptors", () => {
    expect(mimeTypeForBitmapFontDescriptor("desyrel.xml")).toBe(
      "application/xml; charset=utf-8",
    );
    expect(mimeTypeForBitmapFontDescriptor("desyrel.fnt")).toBe(
      "text/plain; charset=utf-8",
    );
  });
});
