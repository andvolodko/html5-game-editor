import { describe, expect, it } from "vitest";
import {
  collectGltfExternalUris,
  extractGltfAnimationNames,
  gltfFormatFromFileName,
  isSupportedGlbExtension,
  isSupportedGltfExtension,
  isSupportedGltfFile,
  isSupportedGltfJsonExtension,
  mimeTypeForGltfFileName,
  parseGlbJson,
  parseGltfJsonBytes,
} from "./gltf-extensions.js";

describe("gltf-extensions", () => {
  it("recognizes glb/gltf extensions", () => {
    expect(isSupportedGltfExtension("hero.glb")).toBe(true);
    expect(isSupportedGltfExtension("hero.gltf")).toBe(true);
    expect(isSupportedGltfExtension("hero.png")).toBe(false);
    expect(isSupportedGlbExtension("hero.glb")).toBe(true);
    expect(isSupportedGlbExtension("hero.gltf")).toBe(false);
    expect(isSupportedGltfJsonExtension("hero.gltf")).toBe(true);
  });

  it("maps MIME and format", () => {
    expect(mimeTypeForGltfFileName("a.glb")).toBe("model/gltf-binary");
    expect(mimeTypeForGltfFileName("a.gltf")).toBe("model/gltf+json");
    expect(gltfFormatFromFileName("a.glb")).toBe("glb");
    expect(gltfFormatFromFileName("a.gltf")).toBe("gltf");
  });

  it("filters browser File objects", () => {
    expect(isSupportedGltfFile({ name: "m.glb" })).toBe(true);
    expect(isSupportedGltfFile({ name: "m.gltf" })).toBe(true);
    expect(
      isSupportedGltfFile({ name: "m.bin", type: "model/gltf-binary" }),
    ).toBe(true);
  });

  it("collects relative buffer and image URIs", () => {
    const json = {
      buffers: [
        { uri: "hero.bin" },
        { uri: "data:application/octet-stream;base64,AA" },
      ],
      images: [{ uri: "hero.png" }, { uri: "https://cdn.example/tex.png" }],
    };
    expect(collectGltfExternalUris(json)).toEqual(["hero.bin", "hero.png"]);
  });

  it("parses gltf json bytes", () => {
    const bytes = new TextEncoder().encode('{"asset":{"version":"2.0"}}');
    expect(parseGltfJsonBytes(bytes)).toEqual({ asset: { version: "2.0" } });
  });

  it("extracts animation names from glTF JSON", () => {
    expect(
      extractGltfAnimationNames({
        animations: [{ name: "idle" }, { name: "walk" }, {}],
      }),
    ).toEqual(["idle", "walk", "animation_2"]);
    expect(extractGltfAnimationNames({})).toEqual([]);
  });

  it("parses GLB JSON chunk and animation names", () => {
    const json = '{"asset":{"version":"2.0"},"animations":[{"name":"run"}]}';
    const jsonBytes = new TextEncoder().encode(json);
    const paddedLength = Math.ceil(jsonBytes.length / 4) * 4;
    const totalLength = 12 + 8 + paddedLength;
    const buffer = new ArrayBuffer(totalLength);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    view.setUint32(0, 0x46546c67, true);
    view.setUint32(4, 2, true);
    view.setUint32(8, totalLength, true);
    view.setUint32(12, paddedLength, true);
    view.setUint32(16, 0x4e4f534a, true);
    bytes.set(jsonBytes, 20);
    for (let i = jsonBytes.length; i < paddedLength; i += 1) {
      bytes[20 + i] = 0x20;
    }
    expect(parseGlbJson(bytes)).toEqual({
      asset: { version: "2.0" },
      animations: [{ name: "run" }],
    });
    expect(extractGltfAnimationNames(parseGlbJson(bytes))).toEqual(["run"]);
  });
});
