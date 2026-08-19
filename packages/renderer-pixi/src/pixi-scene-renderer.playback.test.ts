import { describe, expect, it } from "vitest";
import { AnimatedSprite, Texture } from "pixi.js";
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
    expect(container.eventMode).toBe("static");
    expect(container.cursor).not.toBe("grab");
    // Playback aliases visualsRoot to the node container (no wrapper).
    expect(visuals).toBe(container);
    expect(visuals.eventMode).toBe("static");
    expect(visuals.cursor).not.toBe("grab");
    // Leaf nodes have no children host until a child is attached.
    expect(renderer.getRuntimeChildrenRoot(node.id)).toBeUndefined();

    renderer.setSelectedNodeIds([node.id]);
    expect(renderer.getRuntimeGizmoRoot(node.id)).toBeUndefined();

    await renderer.destroy();
  });

  it("applies serialized pointer event mode and cursor in playback", async () => {
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
    node.pointerEventMode = "none";
    node.cursor = "pointer";
    node.pointerChildren = false;
    renderer.createNode(node);

    const container = renderer.getRuntimeContainer(node.id)!;
    expect(container.eventMode).toBe("none");
    expect(container.cursor).toBe("pointer");

    node.cursor = "crosshair";
    renderer.updateNode(node);
    expect(renderer.getRuntimeContainer(node.id)!.cursor).toBe("crosshair");

    await renderer.destroy();
  });

  it("keeps a lean display tree without editor chrome", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
      editable: false,
    });
    await renderer.whenReady();

    const parent = createSpriteNode("Parent", { x: 0, y: 0 });
    const child = createSpriteNode("Child", { x: 10, y: 0 });
    child.parentId = parent.id;
    renderer.createNode(parent);
    renderer.createNode(child);

    const parentContainer = renderer.getRuntimeContainer(parent.id)!;
    const childContainer = renderer.getRuntimeContainer(child.id)!;
    const childrenRoot = renderer.getRuntimeChildrenRoot(parent.id)!;

    expect(parentContainer.label).toBe("Parent");
    expect(childContainer.label).toBe("Child");
    // No placeholder / selection / dedicated visuals wrapper.
    expect(parentContainer.children).toContain(childrenRoot);
    expect(childrenRoot.children).toContain(childContainer);
    expect(parentContainer.getChildByLabel("Parent:placeholder")).toBeNull();
    expect(parentContainer.getChildByLabel("Parent:selection")).toBeNull();
    expect(parentContainer.getChildByLabel("Parent:visuals")).toBeNull();
    // Child leaf still has no children host.
    expect(renderer.getRuntimeChildrenRoot(child.id)).toBeUndefined();

    await renderer.destroy();
  });

  it("exposes a stable live transform that writes through to the container", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
      editable: false,
    });
    await renderer.whenReady();

    const node = createSpriteNode("Mover", { x: 40, y: 50 });
    renderer.createNode(node);

    const transform = renderer.getRuntimeTransform2D(node.id);
    expect(transform).toBeDefined();
    expect(transform).toBe(renderer.getRuntimeTransform2D(node.id));
    expect(transform?.x).toBe(40);
    expect(transform?.y).toBe(50);

    transform!.x = 80;
    transform!.y = 90;
    transform!.rotation = 90;
    transform!.scaleX = -1.5;
    transform!.scaleY = 2;

    const container = renderer.getRuntimeContainer(node.id)!;
    expect(container.position.x).toBe(80);
    expect(container.position.y).toBe(90);
    expect(container.rotation).toBeCloseTo(Math.PI / 2);
    expect(container.scale.x).toBe(-1.5);
    expect(container.scale.y).toBe(2);
    expect(transform?.rotation).toBeCloseTo(90);

    await renderer.destroy();
  });

  it("keeps the live playback pose when updateNode refreshes visuals", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
      editable: false,
    });
    await renderer.whenReady();

    const node = createSpriteNode("Mover", { x: 40, y: 50 });
    renderer.createNode(node);
    const transform = renderer.getRuntimeTransform2D(node.id)!;
    transform.x = 220;
    transform.y = 80;
    transform.scaleX = -1;

    renderer.updateNode(node);

    expect(transform.x).toBe(220);
    expect(transform.y).toBe(80);
    expect(transform.scaleX).toBe(-1);
    const container = renderer.getRuntimeContainer(node.id)!;
    expect(container.position.x).toBe(220);
    expect(container.position.y).toBe(80);
    expect(container.scale.x).toBe(-1);

    await renderer.destroy();
  });

  it("keeps reading ctx.transform after a child AnimatedSprite is destroyed", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
      editable: false,
    });
    await renderer.whenReady();

    const node = createSpriteNode("Mover", { x: 40, y: 50 });
    renderer.createNode(node);
    const container = renderer.getRuntimeContainer(node.id)!;
    const sprite = new AnimatedSprite({
      textures: [Texture.WHITE],
      autoPlay: false,
      autoUpdate: false,
    });
    container.addChild(sprite);

    const transform = renderer.getRuntimeTransform2D(node.id)!;
    transform.x = 180;
    sprite.destroy({ children: true });

    expect(transform.x).toBe(180);
    expect(() => {
      transform.x = 190;
    }).not.toThrow();
    expect(transform.x).toBe(190);

    await renderer.destroy();
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

    await renderer.destroy();
  });
});
