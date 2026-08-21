import { afterEach, describe, expect, it, vi } from "vitest";
import { createId, err, ok } from "./index.js";

const UUID_V4_BODY =
  "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const UUID_V4_PATTERN = new RegExp(`^${UUID_V4_BODY}$`);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createId", () => {
  it("creates non-empty ids", () => {
    const id = createId("node");
    expect(id.startsWith("node_")).toBe(true);
  });

  it("falls back to getRandomValues when randomUUID is missing", () => {
    const fill = new Uint8Array(16).fill(0xab);
    vi.stubGlobal("crypto", {
      getRandomValues(target: Uint8Array): Uint8Array {
        target.set(fill.subarray(0, target.length));
        return target;
      },
    });

    const id = createId("node");
    expect(id).toMatch(new RegExp(`^node_${UUID_V4_BODY}$`));
  });

  it("falls back to Math.random when Web Crypto is missing", () => {
    vi.stubGlobal("crypto", {});

    const id = createId();
    expect(id).toMatch(UUID_V4_PATTERN);
  });
});

describe("shared", () => {
  it("builds Result helpers", () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    expect(err("x")).toEqual({ ok: false, error: "x" });
  });
});
