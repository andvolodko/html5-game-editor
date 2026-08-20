import type { Container } from "pixi.js";

export function isPixiWorldVisible(container: Container): boolean {
  let current: Container | null = container;
  while (current) {
    if (!current.visible) {
      return false;
    }
    current = current.parent;
  }
  return true;
}
