import { describe, expect, it } from "vitest";
import {
  createDefaultAndroidBuildSettings,
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
    const parsed = parseProjectData(valid);
    expect(parsed.name).toBe(valid.name);
    expect(parsed.android).toEqual(
      createDefaultAndroidBuildSettings(valid.displayName, valid.name),
    );
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

  it("defaults missing android settings from displayName and name", () => {
    const parsed = parseProjectData(valid);
    expect(parsed.android?.appName).toBe("Editor Features Demo");
    expect(parsed.android?.applicationId).toBe(
      "com.gameeditor.editor_features_demo",
    );
    expect(parsed.android?.versionCode).toBe(1);
  });

  it("preserves explicit android settings including signing and branding ids", () => {
    const withAndroid = parseProjectData({
      ...valid,
      android: {
        appName: "Solitaire",
        applicationId: "com.example.solitaire",
        versionName: "2.1.0",
        versionCode: 21,
        orientation: "portrait",
        fullscreen: false,
        immersiveMode: false,
        keepScreenAwake: true,
        keystorePath: "signing/release.jks",
        keyAlias: "upload",
        iconAssetId: "asset_icon",
        splashAssetId: "asset_splash",
      },
    });
    expect(withAndroid.android).toEqual({
      appName: "Solitaire",
      applicationId: "com.example.solitaire",
      versionName: "2.1.0",
      versionCode: 21,
      orientation: "portrait",
      fullscreen: false,
      immersiveMode: false,
      keepScreenAwake: true,
      keystorePath: "signing/release.jks",
      keyAlias: "upload",
      iconAssetId: "asset_icon",
      splashAssetId: "asset_splash",
    });
  });

  it("rejects invalid android application ids and version codes", () => {
    expect(() =>
      parseProjectData({
        ...valid,
        android: {
          ...createDefaultAndroidBuildSettings(valid.displayName, valid.name),
          applicationId: "not a package",
        },
      }),
    ).toThrow();
    expect(() =>
      parseProjectData({
        ...valid,
        android: {
          ...createDefaultAndroidBuildSettings(valid.displayName, valid.name),
          versionCode: 0,
        },
      }),
    ).toThrow();
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

  it("round-trips through serialize including android", () => {
    const parsed = parseProjectData(valid);
    const json = serializeProjectData(parsed);
    expect(json.endsWith("\n")).toBe(true);
    expect(parseProjectData(JSON.parse(json) as unknown)).toEqual(parsed);
    expect(json).toContain('"android"');
  });
});

describe("project background helpers", () => {
  it("normalizes and converts to pixi color", () => {
    expect(normalizeProjectBackgroundHex(" #0B0D12 ")).toBe("#0b0d12");
    expect(projectBackgroundToPixiColor("#0b0d12")).toBe(0x0b0d12);
  });
});
