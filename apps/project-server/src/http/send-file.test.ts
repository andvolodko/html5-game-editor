import { describe, expect, it } from "vitest";
import { parseBytesRange } from "./send-file.js";

describe("parseBytesRange", () => {
  it("parses open-ended, closed, and suffix ranges", () => {
    expect(parseBytesRange("bytes=0-", 100)).toEqual({ start: 0, end: 99 });
    expect(parseBytesRange("bytes=0-1", 100)).toEqual({ start: 0, end: 1 });
    expect(parseBytesRange("bytes=10-19", 100)).toEqual({ start: 10, end: 19 });
    expect(parseBytesRange("bytes=-10", 100)).toEqual({ start: 90, end: 99 });
  });

  it("ignores missing or unsatisfiable ranges", () => {
    expect(parseBytesRange(undefined, 100)).toBeUndefined();
    expect(parseBytesRange("bytes=", 100)).toBeUndefined();
    expect(parseBytesRange("bytes=50-10", 100)).toBeUndefined();
    expect(parseBytesRange("bytes=100-200", 100)).toBeUndefined();
    expect(parseBytesRange("bytes=0-1,2-3", 100)).toBeUndefined();
  });
});
