import { describe, expect, it } from "vitest";
import { Container } from "pixi.js";
import { countDisplayObjects } from "./pixi-render-stats.js";

describe("countDisplayObjects", () => {
  it("counts the root and every descendant Container", () => {
    const root = new Container();
    const childA = new Container();
    const childB = new Container();
    const grandChild = new Container();
    root.addChild(childA, childB);
    childA.addChild(grandChild);
    expect(countDisplayObjects(root)).toBe(4);
  });
});
