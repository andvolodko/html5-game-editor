export interface Combatant {
  readonly nodeId: string;
  isAlive(): boolean;
  xz(): { x: number; z: number };
  receiveHit(): void;
}

const combatants = new Map<string, Combatant>();

export function registerCombatant(combatant: Combatant): void {
  combatants.set(combatant.nodeId, combatant);
}

export function unregisterCombatant(nodeId: string): void {
  combatants.delete(nodeId);
}

export function getCombatant(nodeId: string): Combatant | undefined {
  return combatants.get(nodeId);
}

export function listOtherLivingCombatants(nodeId: string): Combatant[] {
  const others: Combatant[] = [];
  for (const combatant of combatants.values()) {
    if (combatant.nodeId !== nodeId && combatant.isAlive()) {
      others.push(combatant);
    }
  }
  return others;
}

export function nearestLivingCombatant(
  nodeId: string,
  origin: { x: number; z: number },
  maxDistance: number,
): Combatant | undefined {
  let best: Combatant | undefined;
  let bestDistance = maxDistance;
  for (const combatant of listOtherLivingCombatants(nodeId)) {
    const pos = combatant.xz();
    const distance = Math.hypot(pos.x - origin.x, pos.z - origin.z);
    if (distance <= bestDistance) {
      best = combatant;
      bestDistance = distance;
    }
  }
  return best;
}
