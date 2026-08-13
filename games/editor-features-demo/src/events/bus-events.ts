import type { BusEventDefinition } from "@game-editor/game-components";

/**
 * Explicit bus event catalog for editor-features-demo.
 * Inspector `dynamicEnum` source `busEvents` and runtime EventBus share this list.
 */
export const GAME_BUS_EVENTS = [
  { id: "game.start", label: "Game Start" },
  { id: "game.goto-main", label: "Go To Main" },
  { id: "game.goto-test", label: "Go To Test" },
  { id: "game.goto-spine", label: "Go To Spine" },
  { id: "loading.complete", label: "Loading Complete" },
] as const satisfies readonly BusEventDefinition[];

export type GameBusEventId = (typeof GAME_BUS_EVENTS)[number]["id"];

export function listGameBusEvents(): readonly BusEventDefinition[] {
  return GAME_BUS_EVENTS;
}
