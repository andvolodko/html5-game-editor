import { describe, expect, it } from "vitest";
import { applyPlaybackCanvasLayout } from "./playback-canvas-layout.js";

function emptyStyle(): {
  position: string;
  left: string;
  top: string;
  right: string;
  bottom: string;
  width: string;
  height: string;
  display: string;
  objectFit: string;
  maxWidth: string;
  maxHeight: string;
  margin: string;
} {
  return {
    position: "",
    left: "",
    top: "",
    right: "",
    bottom: "",
    width: "",
    height: "",
    display: "",
    objectFit: "",
    maxWidth: "",
    maxHeight: "",
    margin: "",
  };
}

describe("applyPlaybackCanvasLayout", () => {
  it("fills the parent with inset 0 instead of the backbuffer pixel size", () => {
    const style = emptyStyle();
    applyPlaybackCanvasLayout({ style }, { clientWidth: 360, clientHeight: 800 });
    expect(style.position).toBe("absolute");
    expect(style.width).toBe("100%");
    expect(style.height).toBe("100%");
    expect(style.left).toBe("0");
    expect(style.right).toBe("0");
    expect(style.objectFit).toBe("fill");
  });
});
