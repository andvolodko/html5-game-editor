import { describe, expect, it } from "vitest";
import {
  createHitZoneComponent,
  createMaskComponent,
  createScriptComponent,
  createSpriteNode,
  type SceneNodeData,
} from "@game-editor/scene";
import { ComponentRegistry } from "@game-editor/game-components";
import {
  ComponentClipboard,
  describeCopiedComponents,
  isCopyableComponent,
  listCopyableComponents,
  pasteComponentRejection,
  pasteComponentsBlockedReason,
  selectPasteableComponents,
} from "./component-clipboard.js";

describe("ComponentClipboard", () => {
  it("stores snapshots that survive later mutation of the source", () => {
    const clipboard = new ComponentClipboard();
    const component = createScriptComponent("example.Spin", { speed: 2 });
    expect(clipboard.copy([component])).toBe(true);
    component.properties.speed = 99;

    const snapshot = clipboard.templates()[0];
    expect(snapshot?.type).toBe("Script");
    if (snapshot?.type === "Script") {
      expect(snapshot.properties.speed).toBe(2);
    }
  });

  it("copies several components at once", () => {
    const clipboard = new ComponentClipboard();
    expect(
      clipboard.copy([
        createScriptComponent("example.Spin", { speed: 1 }),
        createHitZoneComponent(),
      ]),
    ).toBe(true);
    expect(clipboard.templates()).toHaveLength(2);
    expect(clipboard.copy([])).toBe(false);
    expect(clipboard.templates()).toHaveLength(2);
  });
});

describe("pasteComponentRejection", () => {
  const registry = new ComponentRegistry();

  it("rejects a second HitZone and HitZone on 3D-only nodes", () => {
    const sprite = createSpriteNode("Hero");
    sprite.components.push(createHitZoneComponent());
    expect(
      pasteComponentRejection(sprite, createHitZoneComponent(), registry),
    ).toMatch(/already on this node/);

    const threeOnly: SceneNodeData = {
      id: "node_3d",
      name: "Light",
      components: [],
      children: [],
    };
    expect(
      pasteComponentRejection(threeOnly, createHitZoneComponent(), registry),
    ).toMatch(/2D node/);
  });

  it("treats unknown scripts as singletons", () => {
    const node = createSpriteNode("Hero");
    const script = createScriptComponent("game.Raptor", { speed: 1 });
    node.components.push(script);
    expect(pasteComponentRejection(node, script, registry)).toMatch(
      /already on this node/,
    );
  });

  it("describes copied scripts from the registry display name", () => {
    expect(describeCopiedComponents([createHitZoneComponent()], registry)).toBe(
      "Hit Zone",
    );
    expect(
      describeCopiedComponents(
        [createScriptComponent("game.Raptor", {})],
        registry,
      ),
    ).toBe("game.Raptor");
    expect(
      describeCopiedComponents(
        [createHitZoneComponent(), createMaskComponent()],
        registry,
      ),
    ).toBe("2 components");
  });

  it("does not treat Sprite as copyable", () => {
    const node = createSpriteNode("Hero");
    const sprite = node.components.find((c) => c.type === "Sprite");
    expect(sprite && isCopyableComponent(sprite)).toBe(false);
    expect(listCopyableComponents(node)).toEqual([]);
  });

  it("skips components the target already has when selecting a batch", () => {
    const node = createSpriteNode("Hero");
    node.components.push(createHitZoneComponent());
    const spin = createScriptComponent("example.Spin", { speed: 2 });
    const selected = selectPasteableComponents(
      node,
      [createHitZoneComponent(), spin],
      registry,
    );
    expect(selected).toEqual([spin]);
    expect(
      pasteComponentsBlockedReason(
        node,
        [createHitZoneComponent()],
        registry,
      ),
    ).toMatch(/already on this node/);
  });
});
