import { describe, expect, it } from "vitest";
import { parseBitmapFontXml } from "./parse-bitmap-font-xml.js";

const XML = `<font>
    <info face="Desyrel" size="70"/>
    <common lineHeight="87" base="61"/>
    <pages>
        <page id="0" file="desyrel.png"/>
    </pages>
    <chars count="2">
        <char id="65" x="1" y="2" width="10" height="12" xoffset="3" yoffset="4" xadvance="11" page="0" letter="A"/>
        <char id="66" x="20" y="2" width="8" height="12" xoffset="0" yoffset="4" xadvance="9" page="0" letter="B"/>
    </chars>
    <kernings count="1">
        <kerning first="65" second="66" amount="-2"/>
    </kernings>
</font>
`;

describe("parseBitmapFontXml", () => {
  it("reads face, pages, glyphs, and kerning", () => {
    const data = parseBitmapFontXml(XML);
    expect(data.fontFamily).toBe("Desyrel");
    expect(data.fontSize).toBe(70);
    expect(data.lineHeight).toBe(87);
    expect(data.baseLineOffset).toBe(26);
    expect(data.pages).toEqual([{ id: 0, file: "desyrel.png" }]);
    expect(data.chars.A).toMatchObject({
      id: 65,
      x: 1,
      y: 2,
      width: 10,
      height: 12,
      xOffset: 3,
      yOffset: 4,
      xAdvance: 11,
      page: 0,
      letter: "A",
    });
    expect(data.chars.B?.kerning).toEqual({ A: -2 });
  });

  it("rejects XML without a face", () => {
    expect(() =>
      parseBitmapFontXml("<font><common lineHeight=\"1\" base=\"1\"/></font>"),
    ).toThrow(/info/);
  });
});
