import { describe, expect, it } from "vitest";
import { buildStartSceneSelectOptions } from "./start-scene-select-options";

describe("buildStartSceneSelectOptions", () => {
  it("lists scene ids sorted", () => {
    expect(
      buildStartSceneSelectOptions(
        [
          { id: "zulu", path: "assets/scenes/zulu.json" },
          { id: "main", path: "assets/scenes/main.json" },
        ],
        "main",
      ),
    ).toEqual([
      { value: "main", label: "main" },
      { value: "zulu", label: "zulu" },
    ]);
  });

  it("keeps a missing current id visible", () => {
    expect(
      buildStartSceneSelectOptions(
        [{ id: "main", path: "assets/scenes/main.json" }],
        "gone",
      ),
    ).toEqual([
      { value: "gone", label: "(missing) gone" },
      { value: "main", label: "main" },
    ]);
  });
});
