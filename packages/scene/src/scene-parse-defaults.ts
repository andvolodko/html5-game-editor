import { createDefaultTextStyle } from "./factories/text.js";
import type { TextStyleData } from "./visual-components.js";

/**
 * Fill fields added after older scene JSON was written so Zod schemas can
 * keep those properties required (matches current TypeScript types).
 */
export function withSceneParseDefaults(input: unknown): unknown {
  if (!input || typeof input !== "object") {
    return input;
  }
  const scene = input as { nodes?: unknown };
  if (!Array.isArray(scene.nodes)) {
    return input;
  }
  return {
    ...scene,
    nodes: scene.nodes.map((node) => patchNodeTree(node)),
  };
}

function patchNodeTree(node: unknown): unknown {
  if (!node || typeof node !== "object") {
    return node;
  }
  const n = node as {
    components?: unknown[];
    children?: unknown[];
  };
  const components = Array.isArray(n.components)
    ? n.components.map((comp) => patchComponent(comp))
    : n.components;
  const children = Array.isArray(n.children)
    ? n.children.map((child) => patchNodeTree(child))
    : n.children;
  return { ...n, components, children };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function patchComponent(comp: unknown): unknown {
  if (!comp || typeof comp !== "object") {
    return comp;
  }
  const c = comp as Record<string, unknown>;
  if (c.type === "Model3D") {
    return {
      ...c,
      loop: typeof c.loop === "boolean" ? c.loop : true,
      timeScale:
        typeof c.timeScale === "number" && c.timeScale > 0 ? c.timeScale : 1,
      playing: typeof c.playing === "boolean" ? c.playing : true,
    };
  }
  if (c.type === "Text" || c.type === "HTMLText") {
    return {
      ...c,
      style: createDefaultTextStyle(
        isRecord(c.style) ? (c.style as Partial<TextStyleData>) : undefined,
      ),
    };
  }
  return comp;
}
