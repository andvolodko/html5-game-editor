import { describe, expect, it } from "vitest";
import {
  composeProjectBackgroundHex,
  createDefaultAndroidBuildSettings,
  DEFAULT_PROJECT_BACKGROUND,
  DEFAULT_PROJECT_RESOLUTION,
  DEFAULT_PROJECT_SCALE_MODE,
  DEFAULT_START_SCENE,
  normalizeProjectBackgroundHex,
  parseProjectData,
  PROJECT_SCHEMA_VERSION,
  projectBackgroundRgbHex,
  projectBackgroundRendererClear,
  projectBackgroundToClear,
  projectBackgroundToPixiAlpha,
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
  scaleMode: DEFAULT_PROJECT_SCALE_MODE,
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

  it("defaults missing scaleMode to expand", () => {
    const { scaleMode: _ignored, ...withoutScaleMode } = valid;
    const parsed = parseProjectData(withoutScaleMode);
    expect(parsed.scaleMode).toBe(DEFAULT_PROJECT_SCALE_MODE);
  });

  it("preserves explicit contain and cover scaleMode", () => {
    expect(parseProjectData({ ...valid, scaleMode: "contain" }).scaleMode).toBe(
      "contain",
    );
    expect(parseProjectData({ ...valid, scaleMode: "cover" }).scaleMode).toBe(
      "cover",
    );
  });

  it("rejects invalid scaleMode", () => {
    expect(() =>
      parseProjectData({ ...valid, scaleMode: "stretch" } as unknown),
    ).toThrow();
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

  it("accepts 8-digit background hex with alpha", () => {
    expect(
      parseProjectData({ ...valid, background: "#1C2A4A80" }).background,
    ).toBe("#1c2a4a80");
  });

  it("strips opaque 8-digit background hex to #rrggbb", () => {
    expect(
      parseProjectData({ ...valid, background: "#0B0D12FF" }).background,
    ).toBe("#0b0d12");
  });

  it("round-trips translucent background hex", () => {
    const parsed = parseProjectData({ ...valid, background: "#1c2a4a80" });
    const json = serializeProjectData(parsed);
    expect((JSON.parse(json) as ProjectData).background).toBe("#1c2a4a80");
  });

  it("round-trips through serialize including android", () => {
    const parsed = parseProjectData(valid);
    const json = serializeProjectData(parsed);
    expect(json.endsWith("\n")).toBe(true);
    expect(parseProjectData(JSON.parse(json) as unknown)).toEqual(parsed);
    expect(json).toContain('"android"');
    expect(json).toContain('"scaleMode": "expand"');
  });
});

describe("project background helpers", () => {
  it("normalizes and converts to pixi color", () => {
    expect(normalizeProjectBackgroundHex(" #0B0D12 ")).toBe("#0b0d12");
    expect(projectBackgroundToPixiColor("#0b0d12")).toBe(0x0b0d12);
    expect(projectBackgroundToPixiAlpha("#0b0d12")).toBe(1);
  });

  it("converts 8-digit hex to color and alpha", () => {
    expect(projectBackgroundRgbHex("#1c2a4a80")).toBe("#1c2a4a");
    expect(projectBackgroundToClear("#1c2a4a80")).toEqual({
      color: 0x1c2a4a,
      alpha: 0x80 / 0xff,
    });
    expect(composeProjectBackgroundHex("#1C2A4A", 0)).toBe("#1c2a4a00");
    expect(composeProjectBackgroundHex("#1c2a4a", 1)).toBe("#1c2a4a");
    expect(projectBackgroundRendererClear("#1c2a4a80")).toEqual({
      backgroundColor: 0x1c2a4a,
      backgroundAlpha: 0x80 / 0xff,
    });
  });
});
