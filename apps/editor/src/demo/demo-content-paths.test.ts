import { describe, expect, it } from "vitest";
import {
  isAllowedDemoContentRelative,
  isGeneratedTrashRelative,
  parseDemoContentUrl,
} from "./demo-content-paths";

describe("isAllowedDemoContentRelative", () => {
  it("allows source assets and derived Aseprite output", () => {
    expect(isAllowedDemoContentRelative("assets/ui/hero.png")).toBe(true);
    expect(
      isAllowedDemoContentRelative(".generated/assets/characters/hero.json"),
    ).toBe(true);
    expect(
      isAllowedDemoContentRelative("_generated/assets/characters/hero.json"),
    ).toBe(true);
  });

  it("rejects trash, traversal, and other project trees", () => {
    expect(isAllowedDemoContentRelative("assets")).toBe(false);
    expect(isAllowedDemoContentRelative(".generated")).toBe(false);
    expect(isAllowedDemoContentRelative("_generated")).toBe(false);
    expect(isAllowedDemoContentRelative(".generated/asset-trash/x.png")).toBe(
      false,
    );
    expect(isAllowedDemoContentRelative("_generated/asset-trash/x.png")).toBe(
      false,
    );
    expect(isAllowedDemoContentRelative(".generated/folder-trash/x")).toBe(
      false,
    );
    expect(isAllowedDemoContentRelative("assets/../project.json")).toBe(false);
    expect(isAllowedDemoContentRelative(".project/assets.json")).toBe(false);
    expect(isAllowedDemoContentRelative("src/main.ts")).toBe(false);
  });
});

describe("isGeneratedTrashRelative", () => {
  it("matches undo trash folders under .generated", () => {
    expect(isGeneratedTrashRelative("asset-trash")).toBe(true);
    expect(isGeneratedTrashRelative("asset-trash/id/record.json")).toBe(true);
    expect(isGeneratedTrashRelative("folder-trash/assets/ui")).toBe(true);
    expect(isGeneratedTrashRelative("assets/hero.png")).toBe(false);
  });
});

describe("parseDemoContentUrl", () => {
  it("reads project id and project-relative content path", () => {
    expect(
      parseDemoContentUrl("/demo/editor-features-demo/assets/ui/hero.png"),
    ).toEqual({
      projectId: "editor-features-demo",
      relative: "assets/ui/hero.png",
    });
    expect(
      parseDemoContentUrl(
        "/demo/editor-features-demo/_generated/assets/characters/hero.json",
      ),
    ).toEqual({
      projectId: "editor-features-demo",
      relative: ".generated/assets/characters/hero.json",
    });
    expect(
      parseDemoContentUrl(
        "/demo/editor-features-demo/.generated/assets/characters/hero.json",
      ),
    ).toEqual({
      projectId: "editor-features-demo",
      relative: ".generated/assets/characters/hero.json",
    });
  });

  it("rejects paths that are not demo content", () => {
    expect(parseDemoContentUrl("/demo/editor-features-demo")).toBeUndefined();
    expect(
      parseDemoContentUrl("/demo/editor-features-demo/.project/assets.json"),
    ).toBeUndefined();
    expect(
      parseDemoContentUrl(
        "/demo/editor-features-demo/.generated/asset-trash/gone.png",
      ),
    ).toBeUndefined();
    expect(
      parseDemoContentUrl(
        "/demo/editor-features-demo/_generated/asset-trash/gone.png",
      ),
    ).toBeUndefined();
    expect(parseDemoContentUrl("/games/editor-features-demo/assets/x.png")).toBe(
      undefined,
    );
  });
});
