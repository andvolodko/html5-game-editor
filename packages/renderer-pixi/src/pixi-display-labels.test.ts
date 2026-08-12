import { describe, expect, it } from "vitest";
import { createContainerNode, createSpriteNode } from "@game-editor/scene";
import { nodeHelperLabel, nodeRootLabel } from "./pixi-display-labels.js";
import { PixiSceneRenderer } from "./pixi-scene-renderer.js";

describe("pixi display labels", () => {
  it("formats node and helper labels", () => {
    expect(nodeRootLabel("Hero")).toBe("Hero");
    expect(nodeHelperLabel("Hero", "visuals")).toBe("Hero:visuals");
  });

  it("labels editor chrome helpers and refreshes on rename", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
    });
    await renderer.whenReady();

    const node = createSpriteNode("Hero", { x: 0, y: 0 });
    renderer.createNode(node);

    const container = renderer.getRuntimeContainer(node.id)!;
    const visualsRoot = renderer.getRuntimeVisualsRoot(node.id)!;
    const childrenRoot = renderer.getRuntimeChildrenRoot(node.id)!;
    const gizmoRoot = renderer.getRuntimeGizmoRoot(node.id)!;

    expect(container.label).toBe("Hero");
    expect(visualsRoot.label).toBe("Hero:visuals");
    expect(childrenRoot.label).toBe("Hero:children");
    expect(gizmoRoot.label).toBe("Hero:gizmo");
    expect(visualsRoot.getChildByLabel("Hero:placeholder")).not.toBeNull();
    expect(visualsRoot.getChildByLabel("Hero:selection")).not.toBeNull();

    node.name = "MainHero";
    renderer.updateNode(node);
    expect(renderer.getRuntimeContainer(node.id)!.label).toBe("MainHero");
    expect(renderer.getRuntimeVisualsRoot(node.id)!.label).toBe(
      "MainHero:visuals",
    );
    expect(renderer.getRuntimeGizmoRoot(node.id)!.label).toBe("MainHero:gizmo");
    expect(
      visualsRoot.getChildByLabel("MainHero:placeholder"),
    ).not.toBeNull();

    await renderer.destroy();
  });

  it("labels container-only nodes without a leaf visual", async () => {
    const host = { appendChild() {} } as unknown as HTMLElement;
    const renderer = new PixiSceneRenderer({
      canvasParent: host,
      headless: true,
    });
    await renderer.whenReady();

    const group = createContainerNode("Group");
    renderer.createNode(group);

    expect(renderer.getRuntimeContainer(group.id)!.label).toBe("Group");
    expect(renderer.getRuntimeChildrenRoot(group.id)!.label).toBe(
      "Group:children",
    );
    expect(renderer.getRuntimeVisual(group.id)).toBeUndefined();

    await renderer.destroy();
  });
});
