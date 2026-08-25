import type { RegimentSlot, UnitType } from './gameStore.ts';
import type { CombatRole } from '../data/CombatStats.ts';
import { getCombatStats } from '../data/CombatStats.ts';

export function regimentCategory(type: UnitType): CombatRole {
  return getCombatStats(type).role;
}

/**
 * Positions are stored at the same indexes as the builder's army cards.
 * Categorising a mixed army is still useful, but must not reorder its card
 * identities when buildUnits maps positions back onto the army.
 */
export function layoutArmyPositions(
  army: RegimentSlot[],
  teamId: 1 | 2,
): [number, number, number][] {
  const sign = teamId === 1 ? 1 : -1;
  const positions: [number, number, number][] = Array(army.length);
  const groups: Record<CombatRole, { slot: RegimentSlot; index: number }[]> = {
    melee: [],
    ranged: [],
    siege: [],
  };

  army.forEach((slot, index) => groups[regimentCategory(slot.unitType)].push({ slot, index }));

  const placeLine = (group: { slot: RegimentSlot; index: number }[], z: number, spacing: number) => {
    group.forEach(({ index }, groupIndex) => {
      const x = (groupIndex - (group.length - 1) / 2) * spacing;
      positions[index] = [x, 0, sign * z];
    });
  };

  placeLine(groups.melee, 20, 12);
  placeLine(groups.ranged, 34, 14);
  placeLine(groups.siege, 48, 16);
  return positions;
}