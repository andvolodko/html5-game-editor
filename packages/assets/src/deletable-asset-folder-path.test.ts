import { describe, expect, it } from "vitest";
import { ValidationError } from "@game-editor/core";
import { parseDeletableAssetFolderPath } from "./deletable-asset-folder-path.js";

describe("parseDeletableAssetFolderPath", () => {
  it("accepts a nested folder under assets/", () => {
    expect(parseDeletableAssetFolderPath("assets/icons")).toBe("assets/icons");
    expect(parseDeletableAssetFolderPath(" assets/ui/buttons ")).toBe(
      "assets/ui/buttons",
    );
  });

  it("rejects assets root, scenes, traversal, and absolutes", () => {
    expect(() => parseDeletableAssetFolderPath("assets")).toThrow(ValidationError);
    expect(() => parseDeletableAssetFolderPath("assets/scenes")).toThrow(
      ValidationError,
    );
    expect(() => parseDeletableAssetFolderPath("assets/scenes/ui")).toThrow(
      ValidationError,
    );
    expect(() => parseDeletableAssetFolderPath("assets/../secrets")).toThrow(
      ValidationError,
    );
    expect(() => parseDeletableAssetFolderPath("../assets/icons")).toThrow(
      ValidationError,
    );
    expect(() => parseDeletableAssetFolderPath("/assets/icons")).toThrow(
      ValidationError,
    );
    expect(() => parseDeletableAssetFolderPath("C:/assets/icons")).toThrow(
      ValidationError,
    );
    expect(() => parseDeletableAssetFolderPath("icons")).toThrow(ValidationError);
    expect(() => parseDeletableAssetFolderPath("assets/bad/name!")).toThrow(
      ValidationError,
    );
  });
});
