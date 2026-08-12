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
