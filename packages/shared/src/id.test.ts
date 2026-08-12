import { describe, expect, it } from "vitest";
import { createId, err, ok } from "./index.js";

describe("shared", () => {
  it("creates non-empty ids", () => {
    const id = createId("node");
    expect(id.startsWith("node_")).toBe(true);
  });

  it("builds Result helpers", () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    expect(err("x")).toEqual({ ok: false, error: "x" });
  });
});
