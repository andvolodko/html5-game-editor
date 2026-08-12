import { describe, expect, it } from "vitest";
import { createSpriteNode } from "@game-editor/scene";
import { PixiSceneRenderer } from "./pixi-scene-renderer.js";

describe("PixiSceneRenderer playback mode", () => {
  it("omits gizmos and grab cursors when editable is false", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
      editable: false,
    });
    await renderer.whenReady();

    const node = createSpriteNode("Sprite", { x: 0, y: 0 }, {
      width: 64,
      height: 64,
    });
    renderer.createNode(node);

    const container = renderer.getRuntimeContainer(node.id)!;
    const visuals = renderer.getRuntimeVisualsRoot(node.id)!;

    expect(renderer.getRuntimeGizmoRoot(node.id)).toBeUndefined();
    expect(container.eventMode).toBe("passive");
    expect(container.cursor).not.toBe("grab");
    // Playback keeps visuals hittable so script components can receive clicks.
    expect(visuals.eventMode).toBe("static");
    expect(visuals.cursor).not.toBe("grab");

    renderer.setSelectedNodeIds([node.id]);
    expect(renderer.getRuntimeGizmoRoot(node.id)).toBeUndefined();
  });

  it("keeps identity camera when editable is false", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
      editable: false,
    });
    await renderer.whenReady();

    expect(renderer.getViewportCamera()).toEqual({
      pan: { x: 0, y: 0 },
      scale: 1,
    });
  });
});
