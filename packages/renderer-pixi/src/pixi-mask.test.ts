import { describe, expect, it } from "vitest";
import {
  createContainerNode,
  createMaskComponent,
  createMaskNode,
  createSpriteNode,
} from "@game-editor/scene";
import { PixiSceneRenderer } from "./pixi-scene-renderer.js";

async function flushPaint(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("Pixi Mask", () => {
  it("clips contentRoot in the editor and leaves chrome unmasked", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
    });
    await renderer.whenReady();

    const node = createSpriteNode("Hero", { x: 0, y: 0 }, {
      width: 64,
      height: 64,
    });
    node.components.push(
      createMaskComponent({
        shape: { type: "rectangle", width: 40, height: 40 },
      }),
    );
    renderer.createNode(node);
    await flushPaint();
    renderer.setSelectedNodeIds([node.id]);
    await flushPaint();

    const container = renderer.getRuntimeContainer(node.id)!;
    const contentRoot = renderer.getRuntimeContentRoot(node.id)!;
    const chromeRoot = renderer.getRuntimeChromeRoot(node.id)!;
    const stencil = renderer.getRuntimeMaskStencil(node.id);
    const gizmo = renderer.getRuntimeGizmoRoot(node.id);

    expect(contentRoot).not.toBe(container);
    expect(chromeRoot.parent).toBe(container);
    expect(contentRoot.parent).toBe(container);
    expect(chromeRoot.parent).not.toBe(contentRoot);
    expect(gizmo?.parent).toBe(chromeRoot);
    expect(container.mask).toBeFalsy();
    expect(contentRoot.mask).toBe(stencil);
    expect(stencil).not.toBe(renderer.getRuntimeVisual(node.id));
    expect(stencil?.eventMode).toBe("none");
    expect(stencil?.renderable).toBe(true);
    expect(renderer.getRuntimeMaskOverlay(node.id)?.visible).toBe(true);
    expect(renderer.getRuntimeMaskGizmoRoot(node.id)?.visible).toBe(true);

    await renderer.destroy();
  });

  it("sets inverse on the clip and keeps the stencil collectable", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
    });
    await renderer.whenReady();

    const node = createSpriteNode("Hero", { x: 0, y: 0 }, {
      width: 64,
      height: 64,
    });
    node.components.push(
      createMaskComponent({
        inverse: true,
        shape: { type: "rectangle", width: 40, height: 40 },
      }),
    );
    renderer.createNode(node);
    await flushPaint();

    const contentRoot = renderer.getRuntimeContentRoot(node.id)!;
    const stencil = renderer.getRuntimeMaskStencil(node.id);
    expect(contentRoot.mask).toBe(stencil);
    expect(stencil?.renderable).toBe(true);
    expect(
      (contentRoot as { _maskOptions?: { inverse?: boolean } })._maskOptions
        ?.inverse,
    ).toBe(true);

    await renderer.destroy();
  });

  it("hides the editor overlay and handles when Mask is disabled", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
    });
    await renderer.whenReady();

    const node = createSpriteNode("Hero", { x: 0, y: 0 }, {
      width: 64,
      height: 64,
    });
    node.components.push(
      createMaskComponent({
        enabled: false,
        shape: { type: "rectangle", width: 40, height: 40 },
      }),
    );
    renderer.createNode(node);
    await flushPaint();
    renderer.setSelectedNodeIds([node.id]);
    await flushPaint();

    expect(renderer.getRuntimeMaskOverlay(node.id)?.visible).toBe(false);
    expect(renderer.getRuntimeMaskGizmoRoot(node.id)?.visible).toBe(false);
    expect(renderer.getRuntimeContentRoot(node.id)?.mask).toBeFalsy();

    await renderer.destroy();
  });

  it("keeps scene children in the graph when clipped", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
    });
    await renderer.whenReady();

    const parent = createMaskNode("Clip", { x: 0, y: 0 });
    const child = createSpriteNode("Child", { x: 200, y: 0 }, {
      width: 32,
      height: 32,
    });
    child.parentId = parent.id;
    parent.children = [child];

    renderer.createNode(parent);
    renderer.createNode(child);
    await flushPaint();

    const childrenRoot = renderer.getRuntimeChildrenRoot(parent.id)!;
    const contentRoot = renderer.getRuntimeContentRoot(parent.id)!;
    expect(renderer.getRuntimeContainer(child.id)?.parent).toBe(childrenRoot);
    expect(childrenRoot.parent).toBe(contentRoot);
    expect(contentRoot.mask).toBe(renderer.getRuntimeMaskStencil(parent.id));

    await renderer.destroy();
  });

  it("sets playback mask on the node container and does not throw without assetId", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
      editable: false,
    });
    await renderer.whenReady();

    const node = createSpriteNode("Hero", { x: 0, y: 0 }, {
      width: 64,
      height: 64,
    });
    node.components.push(
      createMaskComponent({
        shape: { type: "circle", radius: 12 },
      }),
    );
    renderer.createNode(node);
    await flushPaint();

    const container = renderer.getRuntimeContainer(node.id)!;
    const stencil = renderer.getRuntimeMaskStencil(node.id);
    expect(renderer.getRuntimeContentRoot(node.id)).toBe(container);
    expect(renderer.getRuntimeChromeRoot(node.id)).toBeUndefined();
    expect(container.mask).toBe(stencil);
    expect(stencil).not.toBe(renderer.getRuntimeVisual(node.id));
    expect(stencil?.eventMode).toBe("none");
    expect(stencil?.renderable).toBe(true);

    const spriteMask = createContainerNode("Empty");
    spriteMask.components.push(
      createMaskComponent({ mode: "sprite" }),
    );
    expect(() => renderer.createNode(spriteMask)).not.toThrow();
    await flushPaint();
    expect(renderer.getRuntimeContainer(spriteMask.id)?.mask).toBeFalsy();
    expect(renderer.getRuntimeMaskStencil(spriteMask.id)).toBeUndefined();

    await renderer.destroy();
  });
});
