/**
 * UnitMeshConfig — per-race, per-unit-type mesh visibility configuration.
 *
 * Each race's customizable FBX contains ALL variant meshes (bodies, heads,
 * weapons, shields, shoulderpads, extras).  At runtime we hide every variant
 * then show only the subset appropriate for the unit type, giving each role
 * a distinct silhouette.
 *
 * Node names were extracted from the binary FBX files via `strings`.
 */

import type { Race } from '@/game/store/gameStore';
import type { UnitType } from '@/game/store/gameStore';

/** All variant mesh node names for a given race (everything that can be toggled). */
const ALL_VARIANTS: Record<Race, readonly string[]> = {

  Barbarians: [
    'BRB_body_A','BRB_body_B','BRB_body_C','BRB_body_D',
    'BRB_body_E','BRB_body_F','BRB_body_G','BRB_body_H',
    'BRB_arms_A','BRB_arms_B','BRB_arms_C',
    'BRB_head_A','BRB_head_B','BRB_head_C','BRB_head_D',
    'BRB_head_E','BRB_head_F','BRB_head_G','BRB_head_H',
    'BRB_head_I','BRB_head_J',
    'BRB_legs_A','BRB_legs_B','BRB_legs_C',
    'BRB_Shield_A','BRB_Shield_B','BRB_Shield_C','BRB_Shield_D',
    'BRB_shoulderpads_A','BRB_shoulderpads_B','BRB_shoulderpads_C',
    'BRB_weapon_axe_A','BRB_weapon_axe_B','BRB_weapon_axe_C',
    'BRB_weapon_Bow','BRB_weapon_Dagger',
    'BRB_weapon_hammer_A','BRB_weapon_hammer_B',
    'BRB_weapon_spear',
    'BRB_weapon_staff_A','BRB_weapon_staff_B','BRB_weapon_staff_C',
    'BRB_weapon_sword_A','BRB_weapon_sword_B',
    'BRB_Xtra_bag','BRB_Xtra_quiver','BRB_Xtra_wood',
  ],

  WesternKingdoms: [
    'WK_Units_Body_A','WK_Units_Body_B','WK_Units_Body_C','WK_Units_Body_D','WK_Units_Body_E',
    'WK_Units_Arms_A','WK_Units_Arms_B','WK_Units_Arms_C','WK_Units_Arms_D',
    'WK_Units_head_A','WK_Units_head_B','WK_Units_head_C','WK_Units_head_D',
    'WK_Units_head_E','WK_Units_head_F','WK_Units_head_G','WK_Units_head_H','WK_Units_head_I',
    'WK_Units_Legs_A','WK_Units_Legs_B','WK_Units_Legs_C',
    'WK_Shield_A','WK_Shield_B','WK_Shield_C','WK_Shield_D',
    'WK_Units_shoulderpads_A','WK_Units_shoulderpads_B',
    'WK_weapon_axe_A','WK_weapon_axe_B',
    'WK_weapon_Bow',
    'WK_weapon_hammer_A','WK_weapon_hammer_B',
    'WK_weapon_pick',
    'WK_weapon_spear',
    'WK_weapon_staff_A','WK_weapon_staff_B','WK_weapon_staff_C',
    'WK_weapon_sword_A','WK_weapon_sword_B',
    'WK_Xtra_bag','WK_Xtra_quiver','WK_Xtra_wood',
  ],

  Elves: [
    'ELF_Units_Body_A','ELF_Units_Body_B','ELF_Units_Body_C',
    'ELF_Units_Body_D','ELF_Units_Body_E','ELF_Units_Body_F',
    'ELF_Units_Arms_A','ELF_Units_Arms_B','ELF_Units_Arms_C',
    'ELF_Units_Head_A','ELF_Units_Head_B','ELF_Units_Head_C','ELF_Units_Head_D',
    'ELF_Units_Head_E','ELF_Units_Head_F','ELF_Units_Head_G','ELF_Units_Head_H',
    'ELF_Units_Head_I','ELF_Units_Head_J','ELF_Units_Head_K','ELF_Units_Head_L',
    'ELF_Units_Head_M','ELF_Units_Head_N','ELF_Units_Head_O','ELF_Units_Head_P',
    'ELF_Units_Legs_A','ELF_Units_Legs_B','ELF_Units_Legs_C',
    'ELF_shield_A','ELF_shield_B','ELF_shield_C',
    'ELF_Units_Shoulderpads_A','ELF_Units_Shoulderpads_B','ELF_Units_Shoulderpads_C',
    'ELF_weapon_axe','ELF_weapon_bow','ELF_weapon_dagger','ELF_weapon_hammer',
    'ELF_weapon_spear',
    'ELF_weapon_staff_A','ELF_weapon_staff_B','ELF_weapon_staff_C',
    'ELF_weapon_sword_A','ELF_weapon_sword_B',
    'ELF_Xtra_bag','ELF_Xtra_quiver','ELF_Xtra_wood',
  ],

  Orcs: [
    'ORC_Units_Body_A','ORC_Units_Body_B','ORC_Units_Body_C','ORC_Units_Body_D',
    'ORC_Units_Body_E','ORC_Units_Body_F','ORC_Units_Body_G',
    'ORC_Units_Arms_A','ORC_Units_Arms_B','ORC_Units_Arms_C',
    'ORC_Units_Head_A','ORC_Units_Head_B','ORC_Units_Head_C','ORC_Units_Head_D',
    'ORC_Units_Head_E','ORC_Units_Head_F','ORC_Units_Head_G','ORC_Units_Head_H',
    'ORC_Units_Legs_A','ORC_Units_Legs_B','ORC_Units_Legs_C','ORC_Units_Legs_D',
    'ORC_Shield_A','ORC_Shield_B','ORC_Shield_C','ORC_Shield_D',
    'ORC_Units_Shoulderpads_A','ORC_Units_Shoulderpads_B','ORC_Units_Shoulderpads_C',
    'ORC_Units_Shoulderpads_D','ORC_Units_Shoulderpads_E','ORC_Units_Shoulderpads_F',
    'ORC_weapon_Axe_A','ORC_weapon_Axe_B','ORC_weapon_Axe_C',
    'ORC_weapon_Bow','ORC_weapon_Dagger',
    'ORC_weapon_Hammer','ORC_weapon_Mace_A',
    'ORC_weapon_spear',
    'ORC_weapon_staff_A','ORC_weapon_staff_B','ORC_weapon_staff_C',
    'ORC_weapon_Sword_A','ORC_weapon_Sword_B',
    'ORC_Xtra_Bag','ORC_Xtra_quiver','ORC_Xtra_Wood',
  ],

  Dwarves: [
    'DWF_Units_Body_A','DWF_Units_Body_B','DWF_Units_Body_C','DWF_Units_Body_D','DWF_Units_Body_E',
    'DWF_Units_Arms_A','DWF_Units_Arms_B','DWF_Units_Arms_C',
    'DWF_Units_Head_A','DWF_Units_Head_B','DWF_Units_Head_C','DWF_Units_Head_D',
    'DWF_Units_Head_E','DWF_Units_Head_F','DWF_Units_Head_G','DWF_Units_Head_H',
    'DWF_Units_Head_I','DWF_Units_Head_J','DWF_Units_Head_K','DWF_Units_Head_L',
    'DWF_Units_Head_M','DWF_Units_Head_N',
    'DWF_Units_Legs_A','DWF_Units_Legs_B','DWF_Units_Legs_C',
    'DWF_Shield_A','DWF_Shield_B','DWF_Shield_C','DWF_Shield_D',
    'DWF_Units_Shoulderpads_A','DWF_Units_Shoulderpads_B','DWF_Units_Shoulderpads_C',
    'DWF_Weapon_axe_A','DWF_Weapon_axe_B','DWF_Weapon_axe_C',
    'DWF_Weapon_bow','DWF_Weapon_dagger',
    'DWF_Weapon_hammer_A','DWF_Weapon_hammer_B',
    'DWF_Weapon_pick',
    'DWF_Weapon_spear',
    'DWF_Weapon_staff_A','DWF_Weapon_staff_B',
    'DWF_Weapon_sword_A','DWF_Weapon_sword_B',
    'DWF_Xtra_bag','DWF_Xtra_quiver','DWF_Xtra_wood',
  ],

  Undead: [
    'UD_Units_body_A','UD_Units_body_B','UD_Units_body_C','UD_Units_body_D',
    'UD_Units_body_E','UD_Units_body_F','UD_Units_body_G',
    'UD_Units_arms_A','UD_Units_arms_B','UD_Units_arms_C','UD_Units_arms_D','UD_Units_arms_E',
    'UD_Units_head_A','UD_Units_head_B','UD_Units_head_C','UD_Units_head_D',
    'UD_Units_head_E','UD_Units_head_F','UD_Units_head_G','UD_Units_head_H',
    'UD_Shield_A','UD_Shield_B','UD_Shield_C',
  ],
};

/** Meshes to show for each unit type, per race. */
const UNIT_SHOW: Record<Race, Partial<Record<UnitType, readonly string[]>>> = {

  Barbarians: {
    swordsmen:   ['BRB_body_B','BRB_arms_A','BRB_head_B','BRB_legs_A','BRB_weapon_sword_A','BRB_Shield_B'],
    archers:     ['BRB_body_A','BRB_arms_A','BRB_head_A','BRB_legs_A','BRB_weapon_Bow','BRB_Xtra_quiver'],
    spearmen:    ['BRB_body_C','BRB_arms_B','BRB_head_C','BRB_legs_B','BRB_weapon_spear','BRB_Shield_A'],
    shieldwall:  ['BRB_body_D','BRB_arms_C','BRB_head_D','BRB_legs_C','BRB_Shield_C','BRB_weapon_axe_A','BRB_shoulderpads_B'],
    mage:        ['BRB_body_G','BRB_arms_A','BRB_head_H','BRB_legs_A','BRB_weapon_staff_B'],
    skirmishers: ['BRB_body_A','BRB_arms_A','BRB_head_A','BRB_legs_A','BRB_weapon_Dagger'],
    cavalry:     [],
    heavyCavalry:[], catapult:[], boltThrower:[],
  },

  WesternKingdoms: {
    swordsmen:   ['WK_Units_Body_B','WK_Units_Arms_B','WK_Units_head_C','WK_Units_Legs_A','WK_weapon_sword_A','WK_Shield_B'],
    archers:     ['WK_Units_Body_A','WK_Units_Arms_A','WK_Units_head_B','WK_Units_Legs_A','WK_weapon_Bow','WK_Xtra_quiver'],
    spearmen:    ['WK_Units_Body_C','WK_Units_Arms_C','WK_Units_head_E','WK_Units_Legs_B','WK_weapon_spear'],
    shieldwall:  ['WK_Units_Body_D','WK_Units_Arms_D','WK_Units_head_G','WK_Units_Legs_C','WK_Shield_C','WK_weapon_axe_A','WK_Units_shoulderpads_B'],
    mage:        ['WK_Units_Body_E','WK_Units_Arms_A','WK_Units_head_A','WK_Units_Legs_A','WK_weapon_staff_B'],
    skirmishers: ['WK_Units_Body_A','WK_Units_Arms_A','WK_Units_head_B','WK_Units_Legs_A','WK_weapon_axe_A'],
    cavalry:     [],
    heavyCavalry:[], catapult:[], boltThrower:[],
  },

  Elves: {
    swordsmen:   ['ELF_Units_Body_B','ELF_Units_Arms_B','ELF_Units_Head_E','ELF_Units_Legs_A','ELF_weapon_sword_A','ELF_shield_B'],
    archers:     ['ELF_Units_Body_A','ELF_Units_Arms_A','ELF_Units_Head_C','ELF_Units_Legs_A','ELF_weapon_bow','ELF_Xtra_quiver'],
    spearmen:    ['ELF_Units_Body_C','ELF_Units_Arms_B','ELF_Units_Head_G','ELF_Units_Legs_B','ELF_weapon_spear'],
    shieldwall:  ['ELF_Units_Body_D','ELF_Units_Arms_C','ELF_Units_Head_J','ELF_Units_Legs_C','ELF_shield_C','ELF_weapon_sword_B','ELF_Units_Shoulderpads_B'],
    mage:        ['ELF_Units_Body_E','ELF_Units_Arms_A','ELF_Units_Head_N','ELF_Units_Legs_A','ELF_weapon_staff_B'],
    skirmishers: ['ELF_Units_Body_A','ELF_Units_Arms_A','ELF_Units_Head_A','ELF_Units_Legs_A','ELF_weapon_dagger'],
    cavalry:     [],
    heavyCavalry:[], catapult:[], boltThrower:[],
  },

  Orcs: {
    swordsmen:   ['ORC_Units_Body_A','ORC_Units_Arms_A','ORC_Units_Head_B','ORC_Units_Legs_A','ORC_weapon_Axe_A','ORC_Units_Shoulderpads_A'],
    archers:     ['ORC_Units_Body_B','ORC_Units_Arms_A','ORC_Units_Head_A','ORC_Units_Legs_A','ORC_weapon_Bow','ORC_Xtra_quiver'],
    spearmen:    ['ORC_Units_Body_C','ORC_Units_Arms_B','ORC_Units_Head_C','ORC_Units_Legs_B','ORC_weapon_spear'],
    shieldwall:  ['ORC_Units_Body_D','ORC_Units_Arms_C','ORC_Units_Head_D','ORC_Units_Legs_C','ORC_Shield_C','ORC_weapon_Sword_A','ORC_Units_Shoulderpads_B'],
    mage:        ['ORC_Units_Body_G','ORC_Units_Arms_A','ORC_Units_Head_G','ORC_Units_Legs_A','ORC_weapon_staff_B'],
    skirmishers: ['ORC_Units_Body_A','ORC_Units_Arms_A','ORC_Units_Head_A','ORC_Units_Legs_A','ORC_weapon_Dagger'],
    cavalry:     [],
    heavyCavalry:[], catapult:[], boltThrower:[],
  },

  Dwarves: {
    swordsmen:   ['DWF_Units_Body_B','DWF_Units_Arms_A','DWF_Units_Head_E','DWF_Units_Legs_A','DWF_Weapon_axe_A','DWF_Shield_A'],
    archers:     ['DWF_Units_Body_A','DWF_Units_Arms_A','DWF_Units_Head_A','DWF_Units_Legs_A','DWF_Weapon_bow','DWF_Xtra_quiver'],
    spearmen:    ['DWF_Units_Body_C','DWF_Units_Arms_B','DWF_Units_Head_G','DWF_Units_Legs_B','DWF_Weapon_spear'],
    shieldwall:  ['DWF_Units_Body_D','DWF_Units_Arms_C','DWF_Units_Head_J','DWF_Units_Legs_C','DWF_Shield_C','DWF_Weapon_hammer_A','DWF_Units_Shoulderpads_B'],
    mage:        ['DWF_Units_Body_E','DWF_Units_Arms_A','DWF_Units_Head_N','DWF_Units_Legs_A','DWF_Weapon_staff_A'],
    skirmishers: ['DWF_Units_Body_A','DWF_Units_Arms_A','DWF_Units_Head_A','DWF_Units_Legs_A','DWF_Weapon_dagger'],
    cavalry:     [],
    heavyCavalry:[], catapult:[], boltThrower:[],
  },

  Undead: {
    // Undead weapons live in separate equipment FBXes; body/head/arms give
    // enough visual differentiation between roles.
    swordsmen:   ['UD_Units_body_B','UD_Units_arms_B','UD_Units_head_C'],
    archers:     ['UD_Units_body_A','UD_Units_arms_A','UD_Units_head_B'],
    spearmen:    ['UD_Units_body_C','UD_Units_arms_B','UD_Units_head_D'],
    shieldwall:  ['UD_Units_body_D','UD_Units_arms_D','UD_Units_head_E','UD_Shield_B'],
    mage:        ['UD_Units_body_F','UD_Units_arms_A','UD_Units_head_G'],
    skirmishers: ['UD_Units_body_A','UD_Units_arms_A','UD_Units_head_A'],
    cavalry:     [],
    heavyCavalry:[], catapult:[], boltThrower:[],
  },
};

// ── Cached sets (built once per race) ────────────────────────────────────────

const _allVariantSets: Partial<Record<Race, Set<string>>> = {};

/** Returns the full set of variant mesh names for a race (cached). */
export function getVariantSet(race: Race): Set<string> {
  if (!_allVariantSets[race]) {
    _allVariantSets[race] = new Set(ALL_VARIANTS[race] ?? []);
  }
  return _allVariantSets[race]!;
}

/** Returns the set of mesh names to SHOW for a given race + unit type. */
export function getShowSet(race: Race, unitType: UnitType): Set<string> {
  const show = UNIT_SHOW[race]?.[unitType] ?? [];
  return new Set(show);
}
