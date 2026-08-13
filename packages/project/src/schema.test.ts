import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROJECT_BACKGROUND,
  DEFAULT_PROJECT_RESOLUTION,
  DEFAULT_START_SCENE,
  normalizeProjectBackgroundHex,
  parseProjectData,
  PROJECT_SCHEMA_VERSION,
  projectBackgroundToPixiColor,
  serializeProjectData,
  type ProjectData,
} from "./index.js";

const valid: ProjectData = {
  name: "editor-features-demo",
  version: PROJECT_SCHEMA_VERSION,
  displayName: "Editor Features Demo",
  renderers: ["pixi"],
  startScene: "main",
  resolution: { width: 1280, height: 720 },
  background: DEFAULT_PROJECT_BACKGROUND,
};

describe("project schema", () => {
  it("parses a valid project document", () => {
    expect(parseProjectData(valid)).toEqual(valid);
  });

  it("defaults missing startScene to main", () => {
    const { startScene: _ignored, ...withoutStart } = valid;
    const parsed = parseProjectData(withoutStart);
    expect(parsed.startScene).toBe(DEFAULT_START_SCENE);
  });

  it("defaults missing resolution to 1280x720", () => {
    const { resolution: _ignored, ...withoutResolution } = valid;
    const parsed = parseProjectData(withoutResolution);
    expect(parsed.resolution).toEqual(DEFAULT_PROJECT_RESOLUTION);
  });

  it("defaults missing background to #0b0d12", () => {
    const { background: _ignored, ...withoutBackground } = valid;
    const parsed = parseProjectData(withoutBackground);
    expect(parsed.background).toBe(DEFAULT_PROJECT_BACKGROUND);
  });

  it("normalizes background hex to lowercase", () => {
    expect(parseProjectData({ ...valid, background: "#0B0D12" }).background).toBe(
      "#0b0d12",
    );
  });

  it("rejects empty name and invalid startScene", () => {
    expect(() => parseProjectData({ ...valid, name: "" })).toThrow();
    expect(() =>
      parseProjectData({ ...valid, startScene: "../secret" }),
    ).toThrow();
    expect(() => parseProjectData({ ...valid, renderers: [] })).toThrow();
  });

  it("rejects non-positive resolution", () => {
    expect(() =>
      parseProjectData({
        ...valid,
        resolution: { width: 0, height: 720 },
      }),
    ).toThrow();
    expect(() =>
      parseProjectData({
        ...valid,
        resolution: { width: 1280, height: -1 },
      }),
    ).toThrow();
  });

  it("rejects invalid background colors", () => {
    expect(() =>
      parseProjectData({ ...valid, background: "red" }),
    ).toThrow();
    expect(() =>
      parseProjectData({ ...valid, background: "#fff" }),
    ).toThrow();
  });

  it("round-trips through serialize", () => {
    const json = serializeProjectData(valid);
    expect(json.endsWith("\n")).toBe(true);
    expect(parseProjectData(JSON.parse(json) as unknown)).toEqual(valid);
  });
});

describe("project background helpers", () => {
  it("normalizes and converts to pixi color", () => {
    expect(normalizeProjectBackgroundHex(" #0B0D12 ")).toBe("#0b0d12");
    expect(projectBackgroundToPixiColor("#0b0d12")).toBe(0x0b0d12);
  });
});
