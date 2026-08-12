import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROJECT_RESOLUTION,
  DEFAULT_START_SCENE,
  parseProjectData,
  PROJECT_SCHEMA_VERSION,
  serializeProjectData,
  type ProjectData,
} from "./index.js";

const valid: ProjectData = {
  name: "example-game",
  version: PROJECT_SCHEMA_VERSION,
  displayName: "Example Game",
  renderers: ["pixi"],
  startScene: "main",
  resolution: { width: 1280, height: 720 },
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

  it("round-trips through serialize", () => {
    const json = serializeProjectData(valid);
    expect(json.endsWith("\n")).toBe(true);
    expect(parseProjectData(JSON.parse(json) as unknown)).toEqual(valid);
  });
});
