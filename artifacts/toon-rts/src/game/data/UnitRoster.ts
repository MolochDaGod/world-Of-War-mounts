/**
 * UnitRoster — 10 unit archetypes per race with Total War-style metadata.
 * Each archetype maps to a model category (infantry/cavalry/siege) for FBX selection.
 */
import { Race, UnitType } from '@/game/store/gameStore';

export type ModelCategory = 'infantry' | 'cavalry' | 'catapult' | 'boltThrower';
export type ProjectileKind = 'arrow' | 'bolt' | 'stone' | 'magic' | null;

export interface UnitDef {
  type: UnitType;
  icon: string;           // emoji icon for UI
  category: ModelCategory;
  cost: number;           // gold cost
  isRanged: boolean;
  projectile: ProjectileKind;
  /** Stats shown in UI (all 0-100 scale) */
  statAttack: number;
  statDefense: number;
  statSpeed: number;
  statRange: number;
}

/** The 10 archetypes available in the army builder */
export const UNIT_ROSTER: UnitDef[] = [
  {
    type: 'swordsmen',
    icon: '⚔️',
    category: 'infantry',
    cost: 100,
    isRanged: false,
    projectile: null,
    statAttack: 55, statDefense: 50, statSpeed: 50, statRange: 5,
  },
  {
    type: 'spearmen',
    icon: '🗡️',
    category: 'infantry',
    cost: 120,
    isRanged: false,
    projectile: null,
    statAttack: 45, statDefense: 55, statSpeed: 45, statRange: 12,
  },
  {
    type: 'shieldwall',
    icon: '🛡️',
    category: 'infantry',
    cost: 200,
    isRanged: false,
    projectile: null,
    statAttack: 35, statDefense: 90, statSpeed: 25, statRange: 5,
  },
  {
    type: 'archers',
    icon: '🏹',
    category: 'infantry',
    cost: 150,
    isRanged: true,
    projectile: 'arrow',
    statAttack: 50, statDefense: 25, statSpeed: 45, statRange: 70,
  },
  {
    type: 'skirmishers',
    icon: '💨',
    category: 'infantry',
    cost: 100,
    isRanged: false,
    projectile: null,
    statAttack: 45, statDefense: 30, statSpeed: 80, statRange: 5,
  },
  {
    type: 'cavalry',
    icon: '🏇',
    category: 'cavalry',
    cost: 200,
    isRanged: false,
    projectile: null,
    statAttack: 70, statDefense: 50, statSpeed: 85, statRange: 8,
  },
  {
    type: 'heavyCavalry',
    icon: '⚡',
    category: 'cavalry',
    cost: 350,
    isRanged: false,
    projectile: null,
    statAttack: 90, statDefense: 65, statSpeed: 75, statRange: 10,
  },
  {
    type: 'mage',
    icon: '🔮',
    category: 'infantry',
    cost: 300,
    isRanged: true,
    projectile: 'magic',
    statAttack: 85, statDefense: 20, statSpeed: 35, statRange: 55,
  },
  {
    type: 'boltThrower',
    icon: '🎯',
    category: 'boltThrower',
    cost: 350,
    isRanged: true,
    projectile: 'bolt',
    statAttack: 80, statDefense: 30, statSpeed: 15, statRange: 90,
  },
  {
    type: 'catapult',
    icon: '💣',
    category: 'catapult',
    cost: 400,
    isRanged: true,
    projectile: 'stone',
    statAttack: 95, statDefense: 20, statSpeed: 10, statRange: 100,
  },
];

/** Fast lookup by type */
export const ROSTER_MAP = Object.fromEntries(
  UNIT_ROSTER.map(u => [u.type, u]),
) as Record<UnitType, UnitDef>;

// ── Race-specific unit names ───────────────────────────────────────────────────
const NAMES: Record<Race, string[]> = {
  Orcs: [
    'Orc Warriors', 'Troll Peons', 'Shieldguard', 'Troll Headhunters',
    'Orc Runners', 'Wolf Riders', 'Armored Raiders', 'Warlock Coven',
    'Bolt Hurlers', 'Siege Catapult',
  ],
  Elves: [
    'Elven Guard', 'Spear Elves', 'Shield Elves', 'Forest Archers',
    'Windrunners', 'Forest Riders', 'Elven Knights', 'High Mages',
    'Bolt Thrower', 'Elven Ballista',
  ],
  WesternKingdoms: [
    'Swordsmen', 'Pikemen', 'Men-at-Arms', 'Crossbowmen',
    'Mercenaries', 'Mounted Knights', 'Lancers', 'Court Wizards',
    'Arbalest Crew', 'Trebuchet',
  ],
  Dwarves: [
    'Clan Warriors', 'Hammerers', 'Ironbreakers', 'Thunderers',
    'Miners', 'Gyrocopter Riders', 'Ironclad Cavalry', 'Runemasters',
    'Grudge Throwers', 'Organ Gun',
  ],
  Barbarians: [
    'Berserkers', 'Spearmen', 'Shield Bearers', 'Hunters',
    'Marauders', 'Horse Warriors', 'Chaos Riders', 'Shamans',
    'Bolt Casters', 'Battering Ram',
  ],
  Undead: [
    'Skeleton Warriors', 'Grave Guard', 'Tomb Guards', 'Skeleton Archers',
    'Wraiths', 'Skeleton Cavalry', 'Black Knights', 'Necromancers',
    'Screaming Skull', 'Bone Giant',
  ],
};

const DESCRIPTIONS: string[] = [
  'Reliable backbone of any army. Strong in melee at medium cost.',
  'Long spears punish cavalry charges. Solid defensive unit.',
  'Heavily armoured wall. Slow but nearly unbreakable in defense.',
  'Volleys of arrows can shred infantry before they reach your lines.',
  'Swift and elusive. Ideal for flanking and harassment.',
  'Fast mounted warriors. Excellent for flanking and pursuit.',
  'Devastating charge ability. Crashes through enemy formations.',
  'Arcane specialists. Unleash powerful spells at range.',
  'High-tension bolt thrower. Pins down enemy formations at long range.',
  'Massive siege engine hurling boulders. Devastating area damage.',
];

/** Get display name for a unit in a specific race context */
export function getUnitName(race: Race, index: number): string {
  return NAMES[race]?.[index] ?? UNIT_ROSTER[index]?.type ?? '?';
}

/** Get description for the nth unit archetype */
export function getUnitDescription(index: number): string {
  return DESCRIPTIONS[index] ?? '';
}

// Race icons and colours for the UI
export const RACE_META: Record<Race, { icon: string; color: string; bgColor: string }> = {
  Orcs:            { icon: '💀', color: '#6abf4b', bgColor: 'rgba(74,140,42,0.25)' },
  Elves:           { icon: '🌿', color: '#6ab0de', bgColor: 'rgba(91,140,191,0.25)' },
  WesternKingdoms: { icon: '👑', color: '#e0c060', bgColor: 'rgba(192,160,96,0.25)' },
  Dwarves:         { icon: '⚒️', color: '#c88840', bgColor: 'rgba(139,96,64,0.25)' },
  Barbarians:      { icon: '🔥', color: '#e05030', bgColor: 'rgba(176,48,32,0.25)' },
  Undead:          { icon: '☠️', color: '#a070c0', bgColor: 'rgba(106,90,138,0.25)' },
};
