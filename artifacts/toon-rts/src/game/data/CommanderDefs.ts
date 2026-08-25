/**
 * CommanderDefs — 3 commander archetypes per race = 18 total hero units.
 *
 * Commanders are 1.5× size, use the "best" armour/weapon mesh combination,
 * spawn as a single-soldier hero unit, and emit a leadership aura that buffs
 * nearby allies each combat tick.
 */
import type { Race, UnitType } from '../store/gameStore.ts';
import type { AbilityId } from './AbilityDefs.ts';

export type CommanderArchetype = 'champion' | 'warlord' | 'archmage';

export const COMMANDER_ART = {
  emblem: '/assets/generated/commanders/field-commander-emblem.png',
  containerFrame: '/assets/generated/commanders/field-commander-container-frame.png',
} as const;

export interface LeadershipBonus {
  auraRadius:  number;
  type:        'attack' | 'defense' | 'speed';
  multiplier:  number;   // e.g. 1.18 = +18% to that stat
}

export interface CommanderDef {
  id:             string;            // unique key, e.g. 'wk_champion'
  race:           Race;
  archetype:      CommanderArchetype;
  name:           string;
  title:          string;
  lore:           string;
  meshShow:       string[];          // mesh names to SHOW on the model (overrides UnitMeshConfig)
  hp:             number;            // commander HP pool
  basedOnType:    UnitType;          // used for animation category
  leadershipBonus: LeadershipBonus;
  /** Optional unique hero model rendered instead of the base FBX at slot 0 */
  heroModelPath?:    string;
  /** Companion texture for FBX heroes that need an external PNG */
  heroTexturePath?:  string;
  /** World-space scale for the hero model (default: 0.012 GLB / 0.01 FBX) */
  heroModelScale?:   number;
  /**
   * When set, the slot-0 interceptor renders a dedicated animated component
   * instead of the generic HeroCommanderMesh loader.
     * Supported values: 'captain_john_wayne', 'pirate_king', 'scourge_faith_bearer'
   */
  heroComponentId?:  string;
  /** Generated portrait used by the commander chooser and dock. */
  avatarPath?:       string;
  /** Two active abilities available to this commander in battle. */
  heroAbilities: [AbilityId, AbilityId];
  /** Passive bonus description shown under the commander card. */
  heroPassive?: string;
}

// ── Western Kingdoms ─────────────────────────────────────────────────────────
const WK: CommanderDef[] = [
  {
    id: 'wk_champion',
    race: 'WesternKingdoms',
    archetype: 'champion',
    name: 'Captain John Wayne',
    title: 'Captain of the Frontline',
    lore: 'Captain John Wayne leads from the breach, turning disciplined human steel into a moving wall that never gives the enemy a clean flank.',
    meshShow: ['WK_Units_Body_E','WK_Units_Arms_D','WK_Units_head_I','WK_Units_Legs_C',
               'WK_Shield_D','WK_weapon_sword_B','WK_Units_shoulderpads_B'],
    hp: 8000,
    basedOnType: 'shieldwall',
    leadershipBonus: { auraRadius: 12, type: 'attack', multiplier: 1.20 },
    heroComponentId: 'captain_john_wayne',
    avatarPath:      '/assets/generated/commanders/commander-john-wayne-avatar.png',
    heroAbilities: ['cavalry_charge', 'shield_bash'],
    heroPassive: 'Iron Discipline — all nearby allies take 15% less damage',
  },
  {
    id: 'wk_warlord',
    race: 'WesternKingdoms',
    archetype: 'warlord',
    name: 'High Constable',
    title: 'Master of Formation',
    lore: 'A genius of battlefield doctrine, the High Constable turns ragged troops into a disciplined wall of steel through sheer presence alone.',
    meshShow: ['WK_Units_Body_D','WK_Units_Arms_C','WK_Units_head_H','WK_Units_Legs_B',
               'WK_weapon_spear','WK_Units_shoulderpads_B'],
    hp: 7000,
    basedOnType: 'spearmen',
    leadershipBonus: { auraRadius: 18, type: 'defense', multiplier: 1.18 },
    heroModelPath:   '/assets/characters/heroes/golem.fbx',
    heroTexturePath: '/assets/characters/heroes/golem_tex.png',
    heroModelScale:  0.01,
    heroAbilities: ['shield_wall', 'formation_lock'],
    heroPassive: 'Bulwark — shieldwall regiments in aura gain +25% HP',
  },
  {
    id: 'wk_archmage',
    race: 'WesternKingdoms',
    archetype: 'archmage',
    name: 'Battle Mage Primaris',
    title: 'Voice of the Holy Flame',
    lore: 'Channelling ancient scripture into raw arcane force, the Battle Mage Primaris turns the tide with a single incantation.',
    meshShow: ['WK_Units_Body_C','WK_Units_Arms_A','WK_Units_head_F','WK_Units_Legs_A',
               'WK_weapon_staff_C'],
    hp: 5000,
    basedOnType: 'mage',
    leadershipBonus: { auraRadius: 15, type: 'attack', multiplier: 1.25 },
    heroModelPath:   '/assets/characters/heroes/wizard.fbx',
    heroTexturePath: '/assets/characters/heroes/wizard_tex.png',
    heroModelScale:  0.01,
    heroAbilities: ['holy_flame', 'arcane_barrier'],
    heroPassive: 'Holy Aura — mage regiments in aura deal +25% spell damage',
  },
];

// ── Barbarians ────────────────────────────────────────────────────────────────
const BRB: CommanderDef[] = [
  {
    id: 'brb_champion',
    race: 'Barbarians',
    archetype: 'champion',
    name: 'Pirate King Racalvin',
    title: 'Terror of the Iron Seas',
    lore: 'Racalvin sacked seven port cities before breakfast. His fleet answers to no crown, his blade to no law — only to battle.',
    meshShow: ['BRB_body_H','BRB_arms_C','BRB_head_J','BRB_legs_C',
               'BRB_Shield_D','BRB_weapon_axe_C','BRB_shoulderpads_C'],
    hp: 9000,
    basedOnType: 'swordsmen',
    leadershipBonus: { auraRadius: 10, type: 'attack', multiplier: 1.25 },
    heroComponentId: 'pirate_king',
    avatarPath: '/assets/generated/commanders/commander-racalvin-avatar.png',
    heroAbilities: ['cavalry_charge', 'shield_bash'],
  },
  {
    id: 'brb_warlord',
    race: 'Barbarians',
    archetype: 'warlord',
    name: 'War Chief',
    title: 'Fury of the North',
    lore: 'Chosen by the clans at the great gathering, the War Chief commands loyalty through blood and thunder.',
    meshShow: ['BRB_body_G','BRB_arms_B','BRB_head_I','BRB_legs_B',
               'BRB_weapon_hammer_B','BRB_shoulderpads_B'],
    hp: 7500,
    basedOnType: 'infantry',
    leadershipBonus: { auraRadius: 16, type: 'speed', multiplier: 1.22 },
    heroAbilities: ['shield_wall', 'formation_lock'],
  },
  {
    id: 'brb_archmage',
    race: 'Barbarians',
    archetype: 'archmage',
    name: 'Shaman Elder',
    title: 'Bone-Speaker of the Wilds',
    lore: 'Ancient beyond reckoning, the Shaman Elder communes with spirits of the battlefield, bending fate to the tribe\'s will.',
    meshShow: ['BRB_body_F','BRB_arms_A','BRB_head_H','BRB_legs_A',
               'BRB_weapon_staff_C'],
    hp: 5500,
    basedOnType: 'mage',
    leadershipBonus: { auraRadius: 14, type: 'attack', multiplier: 1.28 },
    heroAbilities: ['holy_flame', 'arcane_barrier'],
  },
];

// ── Elves ─────────────────────────────────────────────────────────────────────
const ELF: CommanderDef[] = [
  {
    id: 'elf_champion',
    race: 'Elves',
    archetype: 'champion',
    name: 'High Blade',
    title: 'Warden of the Ancient Wood',
    lore: 'Centuries of combat honed to a single edge — the High Blade moves through enemy lines like wind through leaves.',
    meshShow: ['ELF_Units_Body_F','ELF_Units_Arms_C','ELF_Units_Head_P','ELF_Units_Legs_C',
               'ELF_weapon_sword_B','ELF_Units_Shoulderpads_C'],
    hp: 6500,
    basedOnType: 'swordsmen',
    leadershipBonus: { auraRadius: 12, type: 'speed', multiplier: 1.30 },
    heroModelPath:  '/assets/characters/heroes/hero_franco.glb',
    heroModelScale: 0.012,
    heroAbilities: ['cavalry_charge', 'shield_bash'],
  },
  {
    id: 'elf_warlord',
    race: 'Elves',
    archetype: 'warlord',
    name: 'Storm Warden',
    title: 'Keeper of the Starlit Road',
    lore: 'Where the Storm Warden stands, the formation does not break. Her spear has held the line in a hundred engagements.',
    meshShow: ['ELF_Units_Body_E','ELF_Units_Arms_B','ELF_Units_Head_L','ELF_Units_Legs_B',
               'ELF_weapon_spear','ELF_Units_Shoulderpads_B'],
    hp: 7000,
    basedOnType: 'spearmen',
    leadershipBonus: { auraRadius: 18, type: 'defense', multiplier: 1.22 },
    heroModelPath:  '/assets/characters/heroes/hero_karina.glb',
    heroModelScale: 0.012,
    heroAbilities: ['shield_wall', 'formation_lock'],
  },
  {
    id: 'elf_archmage',
    race: 'Elves',
    archetype: 'archmage',
    name: 'Archmage Elariel',
    title: 'Voice of the Eternal Stars',
    lore: 'The eldest living mage commands forces of nature that could level a city. She fights only when the world itself is at stake.',
    meshShow: ['ELF_Units_Body_D','ELF_Units_Arms_A','ELF_Units_Head_K','ELF_Units_Legs_A',
               'ELF_weapon_staff_C'],
    hp: 5000,
    basedOnType: 'mage',
    leadershipBonus: { auraRadius: 16, type: 'attack', multiplier: 1.30 },
    heroAbilities: ['holy_flame', 'arcane_barrier'],
  },
];

// ── Dwarves ───────────────────────────────────────────────────────────────────
const DWF: CommanderDef[] = [
  {
    id: 'dwf_champion',
    race: 'Dwarves',
    archetype: 'champion',
    name: 'Iron Vanguard',
    title: 'Stone-Sworn Breaker',
    lore: 'Clad in runite plate, the Iron Vanguard has never taken a backward step. Legends say she once held a gate alone for six hours.',
    meshShow: ['DWF_Units_Body_E','DWF_Units_Arms_C','DWF_Units_Head_M','DWF_Units_Legs_C',
               'DWF_Shield_C','DWF_Weapon_hammer_B','DWF_Units_Shoulderpads_C'],
    hp: 9500,
    basedOnType: 'shieldwall',
    leadershipBonus: { auraRadius: 10, type: 'defense', multiplier: 1.25 },
    heroAbilities: ['cavalry_charge', 'shield_bash'],
  },
  {
    id: 'dwf_warlord',
    race: 'Dwarves',
    archetype: 'warlord',
    name: 'Forge Lord',
    title: 'Master of the Iron Host',
    lore: 'Both craftsman and warrior, the Forge Lord built every siege weapon on the field — and will personally operate the biggest one.',
    meshShow: ['DWF_Units_Body_D','DWF_Units_Arms_B','DWF_Units_Head_J','DWF_Units_Legs_B',
               'DWF_Weapon_axe_B','DWF_Units_Shoulderpads_B'],
    hp: 8000,
    basedOnType: 'swordsmen',
    leadershipBonus: { auraRadius: 14, type: 'attack', multiplier: 1.18 },
    heroAbilities: ['shield_wall', 'formation_lock'],
  },
  {
    id: 'dwf_archmage',
    race: 'Dwarves',
    archetype: 'archmage',
    name: 'Runemaster',
    title: 'Keeper of the Living Runes',
    lore: 'Each rune carved into his staff holds the memory of a victory. There are many runes.',
    meshShow: ['DWF_Units_Body_F','DWF_Units_Arms_A','DWF_Units_Head_N','DWF_Units_Legs_A',
               'DWF_Weapon_staff_B'],
    hp: 5500,
    basedOnType: 'mage',
    leadershipBonus: { auraRadius: 14, type: 'attack', multiplier: 1.28 },
    heroAbilities: ['holy_flame', 'arcane_barrier'],
  },
];

// ── Orcs ──────────────────────────────────────────────────────────────────────
const ORC: CommanderDef[] = [
  {
    id: 'orc_champion',
    race: 'Orcs',
    archetype: 'champion',
    name: 'Warboss Gorgrak',
    title: 'Crusher of the Weak',
    lore: 'Gorgrak killed the last Warboss with a headbutt alone, then laughed. The tribe was convinced.',
    meshShow: ['ORC_Units_Body_G','ORC_Units_Arms_C','ORC_Units_Head_H','ORC_Units_Legs_D',
               'ORC_Shield_D','ORC_weapon_Axe_B','ORC_Units_Shoulderpads_B'],
    hp: 10000,
    basedOnType: 'swordsmen',
    leadershipBonus: { auraRadius: 10, type: 'attack', multiplier: 1.28 },
    heroAbilities: ['cavalry_charge', 'shield_bash'],
  },
  {
    id: 'orc_warlord',
    race: 'Orcs',
    archetype: 'warlord',
    name: 'Blood Raider',
    title: 'Rider of the Red Plains',
    lore: 'The Blood Raider strikes fast, strikes hard, and never stops to count the bodies.',
    meshShow: ['ORC_Units_Body_F','ORC_Units_Arms_B','ORC_Units_Head_G','ORC_Units_Legs_C',
               'ORC_weapon_sword_B','ORC_Units_Shoulderpads_A'],
    hp: 7500,
    basedOnType: 'cavalry',
    leadershipBonus: { auraRadius: 15, type: 'speed', multiplier: 1.25 },
    heroAbilities: ['shield_wall', 'formation_lock'],
  },
  {
    id: 'orc_archmage',
    race: 'Orcs',
    archetype: 'archmage',
    name: 'Bone Prophet',
    title: 'Voice of the Dark Moon',
    lore: 'The Bone Prophet reads entrails and futures with equal ease. Both are usually bloody.',
    meshShow: ['ORC_Units_Body_E','ORC_Units_Arms_A','ORC_Units_Head_F','ORC_Units_Legs_A',
               'ORC_weapon_staff_B'],
    hp: 5500,
    basedOnType: 'mage',
    leadershipBonus: { auraRadius: 14, type: 'attack', multiplier: 1.30 },
    heroAbilities: ['holy_flame', 'arcane_barrier'],
  },
];

// ── Undead ────────────────────────────────────────────────────────────────────
const UD: CommanderDef[] = [
  {
    id: 'ud_champion',
    race: 'Undead',
    archetype: 'champion',
    name: 'Scourge Faith Bearer',
    title: 'Bearer of the Last Oath',
    lore: 'The Scourge Faith Bearer carries a dead faith into every battle, raising the fallen standard until the living line finally breaks.',
    meshShow: ['UD_Units_body_H','UD_Units_arms_D','UD_Units_head_H','UD_Shield_B','UD_weapon_Sword_B'],
    hp: 9000,
    basedOnType: 'shieldwall',
    leadershipBonus: { auraRadius: 12, type: 'attack', multiplier: 1.22 },
    heroComponentId: 'scourge_faith_bearer',
    avatarPath: '/assets/generated/commanders/commander-scourge-faith-bearer-avatar.png',
    heroAbilities: ['cavalry_charge', 'shield_bash'],
  },
  {
    id: 'ud_warlord',
    race: 'Undead',
    archetype: 'warlord',
    name: 'Phantom General',
    title: 'Master of the Endless Legion',
    lore: 'The Phantom General has won wars on four continents. He is currently on his third afterlife and shows no signs of stopping.',
    meshShow: ['UD_Units_body_G','UD_Units_arms_C','UD_Units_head_G','UD_weapon_Sword_A'],
    hp: 7000,
    basedOnType: 'swordsmen',
    leadershipBonus: { auraRadius: 18, type: 'defense', multiplier: 1.20 },
    heroAbilities: ['shield_wall', 'formation_lock'],
  },
  {
    id: 'ud_archmage',
    race: 'Undead',
    archetype: 'archmage',
    name: 'Lich Overlord',
    title: 'Eternal Voice of Decay',
    lore: 'The Lich Overlord forgot his own name centuries ago. His enemies remember it still, and whisper it with dread.',
    meshShow: ['UD_Units_body_F','UD_Units_arms_A','UD_Units_head_F','UD_weapon_staff_C'],
    hp: 5000,
    basedOnType: 'mage',
    leadershipBonus: { auraRadius: 15, type: 'attack', multiplier: 1.35 },
    heroAbilities: ['holy_flame', 'arcane_barrier'],
  },
];

// ── Master lookup ─────────────────────────────────────────────────────────────

export const COMMANDER_DEFS: CommanderDef[] = [
  ...WK, ...BRB, ...ELF, ...DWF, ...ORC, ...UD,
];

export const COMMANDER_BY_ID: Record<string, CommanderDef> = Object.fromEntries(
  COMMANDER_DEFS.map(c => [c.id, c]),
);

/** Returns the 3 commanders available for a given race. */
export function getCommandersForRace(race: Race): CommanderDef[] {
  return COMMANDER_DEFS.filter(c => c.race === race);
}
