import { describe, expect, it } from "vitest";
import {
  createEmptyScene,
  findNodeById,
  findScript,
  getHitZone,
  getMask,
  getScriptComponents,
  getSprite,
} from "@game-editor/scene";
import {
  defineComponent,
  registerSharedComponents,
} from "@game-editor/game-components";
import { Editor } from "./editor.js";

const SHARED_METER = "shared.PerformanceMeter";

describe("paste component commands", () => {
  function editorWithCatalog(): Editor {
    const editor = new Editor({ scene: createEmptyScene("Test") });
    editor.replaceComponentCatalog((registry) => {
      registerSharedComponents(registry);
      registry.register(
        defineComponent({
          id: "example.Spin",
          displayName: "Spin",
          category: "UI",
          categoryOrder: 20,
          order: 1,
          properties: {
            speed: { kind: "number", default: 1.5 },
          },
        }),
      );
      registry.register(
        defineComponent({
          id: "example.Vfx",
          displayName: "Vfx",
          category: "FX",
          categoryOrder: 30,
          order: 1,
          allowMultiple: true,
          properties: {
            count: { kind: "number", default: 1 },
          },
        }),
      );
    });
    return editor;
  }

  it("copies a script onto another node with a new id and undo", () => {
    const editor = editorWithCatalog();
    const sourceId = editor.createSprite("Source");
    const targetId = editor.createSprite("Target");
    const componentId = editor.addScriptComponent(sourceId, "example.Spin");
    editor.setScriptProperties(sourceId, componentId, { speed: 4 });
    editor.setScriptEnabled(sourceId, componentId, false);

    expect(editor.copyComponent(sourceId, componentId)).toBe(true);
    expect(editor.copiedComponentLabel()).toBe("Spin");
    expect(editor.canPasteComponent(targetId)).toBe(true);
    expect(editor.canPasteComponent(sourceId)).toBe(false);

    const pastedIds = editor.pasteComponent(targetId);
    expect(pastedIds).toHaveLength(1);
    const pastedId = pastedIds[0];
    expect(pastedId).not.toBe(componentId);
    const target = findNodeById(editor.getScene(), targetId)!;
    const pasted = findScript(target, "example.Spin");
    expect(pasted?.id).toBe(pastedId);
    expect(pasted?.properties.speed).toBe(4);
    expect(pasted?.enabled).toBe(false);

    editor.undo();
    expect(findScript(findNodeById(editor.getScene(), targetId)!, "example.Spin")).toBeUndefined();

    editor.redo();
    expect(findScript(findNodeById(editor.getScene(), targetId)!, "example.Spin")?.id).toBe(
      pastedId,
    );
  });

  it("still pastes after the source component is removed", () => {
    const editor = editorWithCatalog();
    const sourceId = editor.createSprite("Source");
    const targetId = editor.createSprite("Target");
    const componentId = editor.addScriptComponent(sourceId, SHARED_METER);
    editor.copyComponent(sourceId, componentId);
    editor.removeComponent(sourceId, componentId);

    const pastedIds = editor.pasteComponent(targetId);
    expect(pastedIds).toHaveLength(1);
    expect(
      findScript(findNodeById(editor.getScene(), targetId)!, SHARED_METER)?.properties
        .refreshIntervalMs,
    ).toBe(250);
  });

  it("rejects pasting a singleton that the target already has", () => {
    const editor = editorWithCatalog();
    const sourceId = editor.createSprite("Source");
    const targetId = editor.createSprite("Target");
    const componentId = editor.addScriptComponent(sourceId, SHARED_METER);
    editor.addScriptComponent(targetId, SHARED_METER);
    editor.copyComponent(sourceId, componentId);

    expect(editor.pasteComponentBlockedReason(targetId)).toMatch(/already on this node/);
    expect(editor.pasteComponent(targetId)).toEqual([]);
  });

  it("allows pasting allowMultiple scripts onto a node that already has one", () => {
    const editor = editorWithCatalog();
    const sourceId = editor.createSprite("Source");
    const componentId = editor.addScriptComponent(sourceId, "example.Vfx");
    editor.setScriptProperties(sourceId, componentId, { count: 3 });
    editor.copyComponent(sourceId, componentId);

    const secondIds = editor.pasteComponent(sourceId);
    expect(secondIds).toHaveLength(1);
    const secondId = secondIds[0];
    expect(secondId).not.toBe(componentId);
    expect(
      getScriptComponents(findNodeById(editor.getScene(), sourceId)!).map((c) => c.scriptId),
    ).toEqual(["example.Vfx", "example.Vfx"]);
  });

  it("copies HitZone properties onto another 2D node", () => {
    const editor = editorWithCatalog();
    const sourceId = editor.createSprite("Source");
    const targetId = editor.createSprite("Target");
    const zoneId = editor.addHitZone(sourceId);
    editor.setHitZone(sourceId, {
      enabled: false,
      offset: { x: 8, y: 10 },
      shape: { type: "circle", radius: 16 },
    });

    expect(editor.copyComponent(sourceId, zoneId)).toBe(true);
    expect(editor.copiedComponentLabel()).toBe("Hit Zone");
    const pastedIds = editor.pasteComponent(targetId);
    const pasted = getHitZone(findNodeById(editor.getScene(), targetId)!);
    expect(pasted?.id).toBe(pastedIds[0]);
    expect(pasted).toMatchObject({
      enabled: false,
      offset: { x: 8, y: 10 },
      shape: { type: "circle", radius: 16 },
    });
    expect(getHitZone(findNodeById(editor.getScene(), sourceId)!)?.id).toBe(zoneId);
  });

  it("does not paste HitZone onto a node that already has one or a 3D node", () => {
    const editor = editorWithCatalog();
    const sourceId = editor.createSprite("Source");
    const otherId = editor.createSprite("Other");
    const zoneId = editor.addHitZone(sourceId);
    editor.addHitZone(otherId);
    editor.copyComponent(sourceId, zoneId);

    expect(editor.pasteComponent(otherId)).toEqual([]);
    const threeId = editor.createNode("three.container");
    expect(editor.pasteComponentBlockedReason(threeId)).toMatch(/2D node/);
    expect(editor.pasteComponent(threeId)).toEqual([]);
  });

  it("copies Mask onto another 2D node", () => {
    const editor = editorWithCatalog();
    const sourceId = editor.createSprite("Source");
    const targetId = editor.createSprite("Target");
    const maskId = editor.addMask(sourceId);
    editor.setMask(sourceId, { inverse: true, offset: { x: 2, y: 3 } });

    expect(editor.copyComponent(sourceId, maskId)).toBe(true);
    const pastedIds = editor.pasteComponent(targetId);
    expect(getMask(findNodeById(editor.getScene(), targetId)!)?.id).toBe(
      pastedIds[0],
    );
    expect(getMask(findNodeById(editor.getScene(), targetId)!)).toMatchObject({
      inverse: true,
      offset: { x: 2, y: 3 },
    });
  });

  it("does not copy Sprite or Transform components", () => {
    const editor = editorWithCatalog();
    const nodeId = editor.createSprite("Hero");
    const node = findNodeById(editor.getScene(), nodeId)!;
    const sprite = getSprite(node)!;
    expect(editor.copyComponent(nodeId, sprite.id)).toBe(false);
    expect(editor.hasCopiedComponent()).toBe(false);

    const transform = node.components.find((c) => c.type === "Transform2D");
    expect(transform && editor.copyComponent(nodeId, transform.id)).toBe(false);
  });

  it("does not paste onto a locked node", () => {
    const editor = editorWithCatalog();
    const sourceId = editor.createSprite("Source");
    const targetId = editor.createSprite("Target");
    const componentId = editor.addScriptComponent(sourceId, "example.Spin");
    editor.copyComponent(sourceId, componentId);
    editor.setNodeLocked(targetId, true);

    expect(editor.pasteComponentBlockedReason(targetId)).toMatch(/locked/i);
    expect(editor.pasteComponent(targetId)).toEqual([]);
  });

  it("copies all copyable components and pastes them in one undo step", () => {
    const editor = editorWithCatalog();
    const sourceId = editor.createSprite("Source");
    const targetId = editor.createSprite("Target");
    const spinId = editor.addScriptComponent(sourceId, "example.Spin");
    editor.setScriptProperties(sourceId, spinId, { speed: 9 });
    editor.addHitZone(sourceId);
    editor.setHitZone(sourceId, { shape: { type: "circle", radius: 20 } });
    editor.addMask(sourceId);
    editor.setMask(sourceId, { inverse: true });

    expect(editor.copyComponents(sourceId)).toBe(true);
    expect(editor.copiedComponentLabel()).toBe("3 components");

    const pastedIds = editor.pasteComponent(targetId);
    expect(pastedIds).toHaveLength(3);
    const target = findNodeById(editor.getScene(), targetId)!;
    expect(findScript(target, "example.Spin")?.properties.speed).toBe(9);
    expect(getHitZone(target)?.shape).toEqual({ type: "circle", radius: 20 });
    expect(getMask(target)?.inverse).toBe(true);

    editor.undo();
    const undone = findNodeById(editor.getScene(), targetId)!;
    expect(findScript(undone, "example.Spin")).toBeUndefined();
    expect(getHitZone(undone)).toBeUndefined();
    expect(getMask(undone)).toBeUndefined();
  });

  it("pastes remaining components when the target already has a HitZone", () => {
    const editor = editorWithCatalog();
    const sourceId = editor.createSprite("Source");
    const targetId = editor.createSprite("Target");
    editor.addScriptComponent(sourceId, "example.Spin");
    editor.addHitZone(sourceId);
    editor.addHitZone(targetId);

    expect(editor.copyComponents(sourceId)).toBe(true);
    expect(editor.canPasteComponent(targetId)).toBe(true);
    expect(editor.pasteComponent(targetId)).toHaveLength(1);
    expect(
      findScript(findNodeById(editor.getScene(), targetId)!, "example.Spin"),
    ).toBeDefined();
  });

  it("does not copy all when the node has no Script, HitZone, or Mask", () => {
    const editor = editorWithCatalog();
    const nodeId = editor.createSprite("Hero");
    expect(editor.copyComponents(nodeId)).toBe(false);
    expect(editor.hasCopiedComponent()).toBe(false);
  });
});
