import { describe, expect, it } from "vitest";
import {
  createGraphicsComponent,
  createNodeWithVisual,
  defaultGraphicsShape,
} from "@game-editor/scene";
import { PixiSceneRenderer } from "./pixi-scene-renderer.js";

async function flushPaint(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("Pixi Graphics polygon gizmo", () => {
  it("shows vertex and edge handles when a polygon Graphics node is selected", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
    });
    await renderer.whenReady();

    const node = createNodeWithVisual(
      "Poly",
      { x: 0, y: 0 },
      createGraphicsComponent({
        shape: defaultGraphicsShape("polygon"),
      }),
    );
    renderer.createNode(node);
    await flushPaint();
    renderer.setSelectedNodeIds([node.id]);
    await flushPaint();

    const root = renderer.getRuntimeGraphicsPolygonGizmoRoot(node.id);
    expect(root?.visible).toBe(true);
    expect(root?.getChildByLabel("graphicsPolygonGizmo:vertex:0")?.visible).toBe(
      true,
    );
    expect(root?.getChildByLabel("graphicsPolygonGizmo:edge:0")?.visible).toBe(
      true,
    );
    expect(root?.getChildByLabel("graphicsPolygonGizmo:e")?.visible).toBe(false);

    await renderer.destroy();
  });

  it("hides polygon handles for rectangle Graphics", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
    });
    await renderer.whenReady();

    const node = createNodeWithVisual(
      "Rect",
      { x: 0, y: 0 },
      createGraphicsComponent(),
    );
    renderer.createNode(node);
    await flushPaint();
    renderer.setSelectedNodeIds([node.id]);
    await flushPaint();

    expect(renderer.getRuntimeGraphicsPolygonGizmoRoot(node.id)?.visible).toBe(
      false,
    );

    await renderer.destroy();
  });
});
