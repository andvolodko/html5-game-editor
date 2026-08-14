import type { BusEventDefinition } from "@game-editor/game-components";

/**
 * Explicit bus event catalog for solitaire.
 * Inspector `dynamicEnum` source `busEvents` and runtime EventBus share this list.
 */
export const SOLITAIRE_BUS_EVENTS = [] as const satisfies readonly BusEventDefinition[];

export type SolitaireBusEventId = (typeof SOLITAIRE_BUS_EVENTS)[number]["id"];

export function listSolitaireBusEvents(): readonly BusEventDefinition[] {
  return SOLITAIRE_BUS_EVENTS;
}
