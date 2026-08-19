import { describe, expect, it } from "vitest";
import {
  createContainerNode,
  createGraphicsComponent,
  createHitZoneComponent,
  createHitZoneNode,
  createNodeWithVisual,
  createSpriteNode,
  spriteGizmoHitOutsets,
} from "@game-editor/scene";
import { Circle, Rectangle } from "pixi.js";
import { PixiSceneRenderer } from "./pixi-scene-renderer.js";

async function flushPaint(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("Pixi HitZone", () => {
  it("keeps editor chrome hitArea on visualsRoot and unions an oversized zone", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
    });
    await renderer.whenReady();

    const node = createSpriteNode("Button", { x: 0, y: 0 }, {
      width: 64,
      height: 64,
    });
    node.components.push(
      createHitZoneComponent({
        shape: { type: "rectangle", width: 200, height: 80 },
      }),
    );
    renderer.createNode(node);
    await flushPaint();
    expect(renderer.getRuntimeHitZoneOverlay(node.id)?.eventMode).toBe("none");
    renderer.setSelectedNodeIds([node.id]);
    await flushPaint();

    const container = renderer.getRuntimeContainer(node.id)!;
    const visuals = renderer.getRuntimeVisualsRoot(node.id)!;
    expect(container.hitArea).toBeUndefined();
    expect(visuals.hitArea).toBeInstanceOf(Rectangle);

    const outset = spriteGizmoHitOutsets();
    const hit = visuals.hitArea as Rectangle;
    expect(hit.width).toBeGreaterThanOrEqual(200 + outset.left + outset.right);
    expect(hit.height).toBeGreaterThanOrEqual(80 + outset.top + outset.bottom);

    const overlay = renderer.getRuntimeHitZoneOverlay(node.id);
    expect(overlay?.visible).toBe(true);
    expect(overlay?.eventMode).toBe("static");
    expect(overlay?.cursor).toBe("move");
    expect(overlay?.hitArea).toBeInstanceOf(Rectangle);
    expect(renderer.getRuntimeHitZoneGizmoRoot(node.id)?.visible).toBe(true);

    await renderer.destroy();
  });

  it("hides the editor overlay and handles when HitZone is disabled", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
    });
    await renderer.whenReady();

    const node = createSpriteNode("Button", { x: 0, y: 0 }, {
      width: 64,
      height: 64,
    });
    node.components.push(
      createHitZoneComponent({
        enabled: false,
        shape: { type: "rectangle", width: 200, height: 80 },
      }),
    );
    renderer.createNode(node);
    await flushPaint();
    renderer.setSelectedNodeIds([node.id]);
    await flushPaint();

    const overlay = renderer.getRuntimeHitZoneOverlay(node.id);
    expect(overlay?.visible).toBe(false);
    expect(overlay?.eventMode).toBe("none");
    expect(renderer.getRuntimeHitZoneGizmoRoot(node.id)?.visible).toBe(false);

    await renderer.destroy();
  });

  it("does not put HitZone hitArea on a parent container so children stay hittable", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
    });
    await renderer.whenReady();

    const parent = createHitZoneNode("Zone", { x: 0, y: 0 });
    const child = createSpriteNode("Child", { x: 200, y: 0 }, {
      width: 32,
      height: 32,
    });
    child.parentId = parent.id;
    parent.children = [child];

    renderer.createNode(parent);
    renderer.createNode(child);
    await flushPaint();

    expect(renderer.getRuntimeContainer(parent.id)!.hitArea).toBeUndefined();
    expect(renderer.getRuntimeContainer(child.id)!.hitArea).toBeUndefined();
    expect(renderer.getRuntimeVisualsRoot(child.id)!.hitArea).toBeInstanceOf(
      Rectangle,
    );

    await renderer.destroy();
  });

  it("uses a dedicated playback hitTarget and disables visual hits", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
      editable: false,
    });
    await renderer.whenReady();

    const node = createNodeWithVisual(
      "Graphics",
      { x: 0, y: 0 },
      createGraphicsComponent({
        shape: { type: "rectangle", width: 64, height: 64 },
      }),
    );
    node.components.push(
      createHitZoneComponent({
        shape: { type: "circle", radius: 10 },
      }),
    );
    renderer.createNode(node);
    await flushPaint();

    const container = renderer.getRuntimeContainer(node.id)!;
    expect(container.hitArea).toBeUndefined();

    const target = renderer.getRuntimeHitZoneTarget(node.id);
    expect(target).toBeDefined();
    expect(target?.parent).toBe(container);
    expect(target?.hitArea).toBeInstanceOf(Circle);
    expect(renderer.getRuntimeVisual(node.id)?.eventMode).toBe("none");
    expect(target?.listenerCount("pointerdown")).toBeGreaterThan(0);

    await renderer.destroy();
  });

  it("lets a grouping HitZone own playback pointer hits instead of children", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
      editable: false,
    });
    await renderer.whenReady();

    const parent = createContainerNode("Button");
    parent.components.push(
      createHitZoneComponent({
        shape: { type: "rectangle", width: 80, height: 40 },
      }),
    );
    const child = createSpriteNode("regular", { x: 0, y: 0 }, {
      width: 64,
      height: 64,
    });
    child.parentId = parent.id;
    parent.children = [child];

    renderer.createNode(parent);
    renderer.createNode(child);
    await flushPaint();

    const childrenRoot = renderer.getRuntimeChildrenRoot(parent.id);
    expect(childrenRoot?.interactiveChildren).toBe(false);
    const target = renderer.getRuntimeHitZoneTarget(parent.id);
    expect(target).toBeDefined();
    expect(target?.listenerCount("pointerdown")).toBeGreaterThan(0);

    await renderer.destroy();
  });

  it("shows polygon vertex and edge handles when selected", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
    });
    await renderer.whenReady();

    const node = createSpriteNode("Button", { x: 0, y: 0 }, {
      width: 64,
      height: 64,
    });
    node.components.push(
      createHitZoneComponent({
        shape: {
          type: "polygon",
          points: [
            { x: 0, y: -40 },
            { x: 40, y: 40 },
            { x: -40, y: 40 },
          ],
        },
      }),
    );
    renderer.createNode(node);
    await flushPaint();
    renderer.setSelectedNodeIds([node.id]);
    await flushPaint();

    const root = renderer.getRuntimeHitZoneGizmoRoot(node.id);
    expect(root?.visible).toBe(true);
    expect(root?.getChildByLabel("hitZoneGizmo:vertex:0")?.visible).toBe(true);
    expect(root?.getChildByLabel("hitZoneGizmo:edge:0")?.visible).toBe(true);
    expect(root?.getChildByLabel("hitZoneGizmo:e")?.visible).toBe(false);

    await renderer.destroy();
  });
});
