import { describe, expect, it } from "vitest";
import { uniqueSelectOptions } from "./unique-select-options";

describe("uniqueSelectOptions", () => {
  it("keeps the first Attack/Defense when Aseprite repeats tags", () => {
    expect(
      uniqueSelectOptions(["Defense", "Attack", "Defense", "Attack"]),
    ).toEqual(["Defense", "Attack"]);
  });
});
