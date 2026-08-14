import { describe, expect, it } from "vitest";
import { fitDisplayInPreview } from "./asset-preview-host.js";

describe("fitDisplayInPreview", () => {
  it("centers a skeleton whose origin is not the AABB center", () => {
    const fit = fitDisplayInPreview({ x: -20, y: -80, width: 40, height: 80 }, 200, 200);
    expect(fit.scale).toBe(2);
    expect(fit.x).toBe(100);
    expect(fit.y).toBe(180);
  });
});
