/**
 * AbilityDefs — every active unit ability and passive definition.
 *
 * Three heal archetypes:
 *  - Crusade mage (Court Wizard):   HOLY TOTEM  — places a ground totem that heals nearby
 *    friendlies 35 HP/s for 12 s, in radius 14.  (targeting: ground click)
 *  - Fabled mage (High Mage):       NATURE'S BOUNTY — instant AOE heal burst, +350 HP to all
 *    friendlies within radius 22 of the caster.  (targeting: self / instant)
 *  - Legion mage (Necromancer):     LIFE DRAIN — toggle aura; while active, every mage attack
 *    also heals nearby friendlies for 45 % of damage dealt.  (targeting: toggle)
 */

import { Race, UnitType } from '../store/gameStore';

// ── Ability IDs ──────────────────────────────────────────────────────────────
export type AbilityId =
  // Crusade
  | 'holy_totem'       // Court Wizard — heal-over-time totem
  | 'shield_bash'      // Men-at-Arms  — AOE melee hit + slow
  | 'cavalry_charge'   // Mounted Knights — next attack 3× damage
  // Fabled
  | 'natures_bounty'   // High Mage    — instant AOE heal burst
  | 'multi_shot'       // Forest Archers — fire at top-3 enemies at once
  | 'wind_step'        // Windrunners  — +80 % speed for 5 s
  // Legion
  | 'life_drain'       // Necromancer  — toggle vampiric aura
  | 'death_strike'     // Death Knights — 3× damage + bleed
  | 'phase_shift'      // Wraiths      — invulnerable 3 s
  ;

export type AbilityTargeting = 'ground' | 'self' | 'toggle';

export interface AbilityDef {
  id: AbilityId;
  name: string;
  description: string;
  shortcut: string;      // display key hint
  icon: string;          // emoji icon
  color: string;         // UI accent hex
  maxCharges: number;
  cooldownPerCharge: number; // seconds per charge recharge
  targeting: AbilityTargeting;
  faction: Race;         // which faction can use it
}

export const ABILITY_DEFS: Record<AbilityId, AbilityDef> = {
  // ── Crusade ────────────────────────────────────────────────────────────────
  holy_totem: {
    id: 'holy_totem', name: 'Holy Totem',
    description: 'Place a totem that heals friendlies 35 HP/s for 12 s (radius 14)',
    shortcut: 'Z', icon: '✚', color: '#ffd700',
    maxCharges: 2, cooldownPerCharge: 35, targeting: 'ground',
    faction: 'WesternKingdoms',
  },
  shield_bash: {
    id: 'shield_bash', name: 'Shield Bash',
    description: 'Slam nearby enemies dealing 150 % damage and slowing them 30 % for 5 s',
    shortcut: 'X', icon: '🛡', color: '#aaccff',
    maxCharges: 1, cooldownPerCharge: 22, targeting: 'self',
    faction: 'WesternKingdoms',
  },
  cavalry_charge: {
    id: 'cavalry_charge', name: 'Charge',
    description: 'Next attack deals 3× damage',
    shortcut: 'Z', icon: '⚡', color: '#ffcc44',
    maxCharges: 2, cooldownPerCharge: 18, targeting: 'self',
    faction: 'WesternKingdoms',
  },

  // ── Fabled ─────────────────────────────────────────────────────────────────
  natures_bounty: {
    id: 'natures_bounty', name: "Nature's Bounty",
    description: 'Instantly heals all friendlies within 22 units for +350 HP',
    shortcut: 'Z', icon: '🌿', color: '#44ff88',
    maxCharges: 1, cooldownPerCharge: 50, targeting: 'self',
    faction: 'Elves',
  },
  multi_shot: {
    id: 'multi_shot', name: 'Multi-Shot',
    description: 'Fire simultaneously at the 3 nearest enemies',
    shortcut: 'X', icon: '🏹', color: '#88ffdd',
    maxCharges: 2, cooldownPerCharge: 12, targeting: 'self',
    faction: 'Elves',
  },
  wind_step: {
    id: 'wind_step', name: 'Wind Step',
    description: '+80 % speed for 5 s',
    shortcut: 'Z', icon: '💨', color: '#aaeeff',
    maxCharges: 2, cooldownPerCharge: 20, targeting: 'self',
    faction: 'Elves',
  },

  // ── Legion ─────────────────────────────────────────────────────────────────
  life_drain: {
    id: 'life_drain', name: 'Life Drain',
    description: 'Toggle: attacks also heal nearby friendlies for 45 % of damage dealt',
    shortcut: 'Z', icon: '🩸', color: '#cc44ff',
    maxCharges: 1, cooldownPerCharge: 0, targeting: 'toggle',
    faction: 'Undead',
  },
  death_strike: {
    id: 'death_strike', name: 'Death Strike',
    description: 'Next attack deals 3× damage and applies a bleed (50/tick × 6 ticks)',
    shortcut: 'X', icon: '💀', color: '#ff4466',
    maxCharges: 1, cooldownPerCharge: 25, targeting: 'self',
    faction: 'Undead',
  },
  phase_shift: {
    id: 'phase_shift', name: 'Phase Shift',
    description: 'Become ethereal (untargetable) for 3 s',
    shortcut: 'Z', icon: '👻', color: '#8866ff',
    maxCharges: 2, cooldownPerCharge: 18, targeting: 'self',
    faction: 'Undead',
  },
};

// ── Per-race + per-unitType ability assignment ────────────────────────────────
// key = `${race}_${unitType}`
export const UNIT_ABILITIES: Partial<Record<string, AbilityId[]>> = {
  // Crusade (WesternKingdoms)
  WesternKingdoms_mage:        ['holy_totem'],
  WesternKingdoms_shieldwall:  ['shield_bash'],
  WesternKingdoms_cavalry:     ['cavalry_charge'],
  WesternKingdoms_heavyCavalry:['cavalry_charge'],
  // Fabled (Elves)
  Elves_mage:        ['natures_bounty'],
  Elves_archers:     ['multi_shot'],
  Elves_skirmishers: ['wind_step'],
  // Legion (Undead)
  Undead_mage:        ['life_drain'],
  Undead_heavyCavalry:['death_strike'],
  Undead_skirmishers: ['phase_shift'],
};

/** Get abilities for a race + unit type combo. */
export function getUnitAbilities(race: Race, type: UnitType): AbilityId[] {
  return UNIT_ABILITIES[`${race}_${type}`] ?? [];
}

// ── Totem data ────────────────────────────────────────────────────────────────
export interface TotemData {
  id: string;
  position: [number, number, number];
  teamId: 1 | 2;
  radius: number;
  healPerSec: number;
  expiresAt: number;   // game elapsed time (seconds) when totem dies
}

// ── Passive ability descriptions (informational only, effects in CombatSystem) ─
export const PASSIVE_LABELS: Partial<Record<string, string>> = {
  WesternKingdoms_shieldwall:  'Passive: +20 % damage reduction',
  WesternKingdoms_cavalry:     'Passive: first charge does +50 % damage',
  Elves_archers:               'Passive: −0.3 s attack cooldown',
  Elves_skirmishers:           'Passive: +15 % evade chance',
  Undead_mage:                 'Passive: Life Drain aura heals friendlies',
  Undead_skirmishers:          'Passive: −15 % incoming damage',
};
