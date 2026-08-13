import type { BusEventDefinition } from "@game-editor/game-components";

/**
 * Explicit bus event catalog for muonline-game.
 * Inspector `dynamicEnum` source `busEvents` and runtime EventBus share this list.
 */
export const MUONLINE_BUS_EVENTS = [] as const satisfies readonly BusEventDefinition[];

export type MuonlineBusEventId = (typeof MUONLINE_BUS_EVENTS)[number]["id"];

export function listMuonlineBusEvents(): readonly BusEventDefinition[] {
  return MUONLINE_BUS_EVENTS;
}
