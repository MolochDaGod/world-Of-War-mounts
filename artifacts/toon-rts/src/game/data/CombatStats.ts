import type { UnitType } from '../store/gameStore';

export type CombatRole = 'melee' | 'ranged' | 'siege';

export interface CombatStats {
  damage: number;
  attackRange: number;
  speed: number;
  attackCooldown: number;
  role: CombatRole;
}

/**
 * Runtime combat truth. Every combat calculation and player-facing stat panel
 * reads this table so a roster card cannot promise values that the battle does
 * not actually use.
 */
export const COMBAT_STATS: Record<UnitType, CombatStats> = {
  infantry: { damage: 100, attackRange: 6, speed: 4.5, attackCooldown: 1.3, role: 'melee' },
  swordsmen: { damage: 100, attackRange: 6, speed: 4.5, attackCooldown: 1.3, role: 'melee' },
  spearmen: { damage: 82, attackRange: 8, speed: 4.0, attackCooldown: 1.3, role: 'melee' },
  shieldwall: { damage: 66, attackRange: 5, speed: 2.5, attackCooldown: 2.0, role: 'melee' },
  skirmishers: { damage: 72, attackRange: 6, speed: 6.5, attackCooldown: 1.0, role: 'melee' },
  archers: { damage: 55, attackRange: 18, speed: 3.5, attackCooldown: 2.3, role: 'ranged' },
  cavalry: { damage: 138, attackRange: 7, speed: 8.0, attackCooldown: 1.0, role: 'melee' },
  heavyCavalry: { damage: 192, attackRange: 8, speed: 7.0, attackCooldown: 1.6, role: 'melee' },
  mage: { damage: 110, attackRange: 14, speed: 2.5, attackCooldown: 2.6, role: 'ranged' },
  boltThrower: { damage: 154, attackRange: 26, speed: 1.5, attackCooldown: 3.9, role: 'siege' },
  catapult: { damage: 220, attackRange: 32, speed: 1.2, attackCooldown: 5.2, role: 'siege' },
  grieeGlee: { damage: 240, attackRange: 14, speed: 2.5, attackCooldown: 3.5, role: 'siege' },
  skeletonWarrior: { damage: 55, attackRange: 5, speed: 4.5, attackCooldown: 0.9, role: 'melee' },
  meshyWarrior: { damage: 145, attackRange: 6, speed: 4.0, attackCooldown: 1.1, role: 'melee' },
};

export function getCombatStats(type: UnitType): CombatStats {
  return COMBAT_STATS[type] ?? COMBAT_STATS.swordsmen;
}

/** Compact, plain-language values suitable for roster cards and HUD labels. */
export function getCombatStatBars(type: UnitType) {
  const stats = getCombatStats(type);
  return {
    attack: Math.min(100, Math.round((stats.damage / 240) * 100)),
    defense: Math.min(100, Math.round((1 / stats.attackCooldown) * 100)),
    speed: Math.min(100, Math.round((stats.speed / 8) * 100)),
    range: Math.min(100, Math.round((stats.attackRange / 32) * 100)),
  };
}