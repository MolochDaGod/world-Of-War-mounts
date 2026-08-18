/**
 * ToonRTSManifest — maps (Race, ModelCategory) → verified FBX asset paths.
 *
 * Animation strategy:
 *  - Infantry/archers/skirmishers/shieldwall/spearmen/mage → Dwarves Worker
 *    animations (idle, run, attack, death) because they have the most complete set.
 *    Cross-race retargeting works when bone names match (same Unity export pipeline).
 *  - Barbarians Spearman attack used as a second attack clip for variety.
 *  - Barbarians Mage cast used as mage attack.
 *  - Cavalry animations are race-specific; Orcs cavalry used as fallback.
 *  - Catapult animations race-specific; WK catapult used as fallback.
 *  - BoltThrower animations from Elves (only race with that FBX).
 */
import { Race } from '@/game/store/gameStore';
import { ModelCategory } from '@/game/data/UnitRoster';

const B = '/assets/Toon_RTS';
const DWF_W = `${B}/Dwarves/animation/Worker`;

/** Animation FBX paths + render scale for a soldier */
export interface SoldierAssets {
  modelPath:   string;
  idlePath:    string;
  runPath:     string;
  attack1Path: string;
  attack2Path: string;  // second attack animation for variety
  deathPath:   string;
  scale:       number;
}

// ── Character model FBX per race ─────────────────────────────────────────────
const INFANTRY_MODEL: Record<Race, string> = {
  Orcs:            `${B}/Orcs/models/ORC_Characters_Customizable.FBX`,
  Elves:           `${B}/Elves/models/ELF_Characters_customizable.FBX`,
  WesternKingdoms: `${B}/WesternKingdoms/models/WK_Characters_customizable.FBX`,
  Dwarves:         `${B}/Dwarves/models/DWF_Characters_customizable.FBX`,
  Barbarians:      `${B}/Barbarians/models/BRB_Characters_customizable.FBX`,
  Undead:          `${B}/Undead/models/UD_Characters_customizable.FBX`,
};

const CAVALRY_MODEL: Record<Race, string> = {
  Orcs:            `${B}/Orcs/models/ORC_Cavalry_Customizable.FBX`,
  Elves:           `${B}/Elves/models/ELF_Cavalry_customizable.FBX`,
  WesternKingdoms: `${B}/WesternKingdoms/models/WK_Cavalry_customizable.FBX`,
  Dwarves:         `${B}/Dwarves/models/DWF_Cavalry_customizable.FBX`,
  Barbarians:      `${B}/Barbarians/models/BRB_Cavalry_customizable.FBX`,
  Undead:          `${B}/Undead/models/UD_Cavalry_customizable.FBX`,
};

// Catapult: Orcs/WK have their own; others borrow WK
const CATAPULT_MODEL: Record<Race, string> = {
  Orcs:            `${B}/Orcs/models/ORC_Catapult.FBX`,
  WesternKingdoms: `${B}/WesternKingdoms/models/WK_Catapult.FBX`,
  Elves:           `${B}/WesternKingdoms/models/WK_Catapult.FBX`,
  Dwarves:         `${B}/Orcs/models/ORC_Catapult.FBX`,
  Barbarians:      `${B}/Orcs/models/ORC_Catapult.FBX`,
  Undead:          `${B}/WesternKingdoms/models/WK_Catapult.FBX`,
};

// BoltThrower: only Elves; others borrow
const BOLT_MODEL: Record<Race, string> = {
  Elves:           `${B}/Elves/models/ELF_BoltThrower.FBX`,
  Orcs:            `${B}/Elves/models/ELF_BoltThrower.FBX`,
  WesternKingdoms: `${B}/Elves/models/ELF_BoltThrower.FBX`,
  Dwarves:         `${B}/Elves/models/ELF_BoltThrower.FBX`,
  Barbarians:      `${B}/Elves/models/ELF_BoltThrower.FBX`,
  Undead:          `${B}/Elves/models/ELF_BoltThrower.FBX`,
};

// ── Infantry/misc animation paths (universal Dwarves Worker) ──────────────────
// Uploaded animation FBX files — now in /assets/characters/animations/
const CA = '/assets/characters/animations';
const INF_ANIM: Pick<SoldierAssets, 'idlePath'|'runPath'|'attack1Path'|'attack2Path'|'deathPath'> = {
  idlePath:    `${CA}/idle.fbx`,
  runPath:     `${CA}/run.fbx`,
  attack1Path: `${CA}/attack.fbx`,
  attack2Path: `${CA}/attack_heavy.fbx`,
  deathPath:   `${CA}/death.fbx`,
};

// ── Cavalry animation paths per race (fallback = Orcs cavalry) ────────────────
const ORC_CAV = {
  idlePath:    `${B}/Orcs/animation/Cavalry/ORC_cavalry_01_idle.FBX`,
  runPath:     `${B}/Orcs/animation/Cavalry/ORC_cavalry_03_run.FBX`,
  attack1Path: `${DWF_W}/DWF_worker_07_attack.FBX`,   // no Orc cav attack clip
  attack2Path: `${B}/Barbarians/animation/Spearman/BRB_spearman_07_attack.FBX`,
  deathPath:   `${B}/Orcs/animation/Cavalry/ORC_cavalry_10_death_B.FBX`,
};

const CAVALRY_ANIM: Record<Race, typeof ORC_CAV> = {
  Orcs:            ORC_CAV,
  Elves: {
    idlePath:    `${B}/Elves/animation/Cavalry_Spear/ELF_cavalry_spear_05_combat_idle.FBX`,
    runPath:     `${B}/Elves/animation/Cavalry_Spear/ELF_cavalry_spear_04_charge.FBX`,
    attack1Path: `${B}/Elves/animation/Cavalry_Spear/ELF_cavalry_spear_07_attack.FBX`,
    attack2Path: `${B}/Elves/animation/Cavalry_Mage/ELF_cavalry_mage_08_attack_B.FBX`,
    deathPath:   `${B}/Elves/animation/Cavalry_Spear/ELF_cavalry_spear_10_death_A.FBX`,
  },
  WesternKingdoms: {
    idlePath:    `${B}/WesternKingdoms/animation/Cavalry/WK_cavalry_01_idle.FBX`,
    runPath:     `${B}/WesternKingdoms/animation/Cavalry/WK_cavalry_03_run.FBX`,
    attack1Path: `${DWF_W}/DWF_worker_07_attack.FBX`,
    attack2Path: `${B}/Barbarians/animation/Spearman/BRB_spearman_07_attack.FBX`,
    deathPath:   `${B}/WesternKingdoms/animation/Cavalry/WK_cavalry_10_death_B.FBX`,
  },
  Dwarves: {
    idlePath:    `${B}/Dwarves/animation/Cavalry/DWF_cavalry_01_idle.FBX`,
    runPath:     `${B}/Dwarves/animation/Cavalry/DWF_cavalry_03_run.FBX`,
    attack1Path: `${DWF_W}/DWF_worker_07_attack.FBX`,
    attack2Path: `${B}/Barbarians/animation/Spearman/BRB_spearman_07_attack.FBX`,
    deathPath:   `${B}/Dwarves/animation/Cavalry/DWF_cavalry_10_death_B.FBX`,
  },
  Barbarians: ORC_CAV,
  Undead:     ORC_CAV,
};

// ── Catapult animations ────────────────────────────────────────────────────────
const ORC_CAT = {
  idlePath:    `${B}/Orcs/animation/Catapult/ORC_catapult_01_idle.FBX`,
  runPath:     `${B}/Orcs/animation/Catapult/ORC_catapult_01_idle.FBX`, // no move clip
  attack1Path: `${B}/Orcs/animation/Catapult/ORC_catapult_03_attack.FBX`,
  attack2Path: `${B}/Orcs/animation/Catapult/ORC_catapult_03_attack.FBX`,
  deathPath:   `${B}/Orcs/animation/Catapult/ORC_catapult_04_death.FBX`,
};
const WK_CAT = {
  idlePath:    `${B}/WesternKingdoms/animation/Catapult/WK_catapult_01_idle.FBX`,
  runPath:     `${B}/WesternKingdoms/animation/Catapult/WK_catapult_01_idle.FBX`,
  attack1Path: `${B}/WesternKingdoms/animation/Catapult/WK_catapult_03_attack.FBX`,
  attack2Path: `${B}/WesternKingdoms/animation/Catapult/WK_catapult_03_attack.FBX`,
  deathPath:   `${B}/WesternKingdoms/animation/Catapult/WK_catapult_04_death.FBX`,
};
const CATAPULT_ANIM: Record<Race, typeof ORC_CAT> = {
  Orcs: ORC_CAT, WesternKingdoms: WK_CAT,
  Elves: WK_CAT, Dwarves: ORC_CAT, Barbarians: ORC_CAT, Undead: WK_CAT,
};

// ── BoltThrower animations ─────────────────────────────────────────────────────
const BOLT_ANIM = {
  idlePath:    `${B}/Elves/animation/BoltThrower/ELF_boltthrower_01_idle.FBX`,
  runPath:     `${B}/Elves/animation/BoltThrower/ELF_boltthrower_01_idle.FBX`,
  attack1Path: `${B}/Elves/animation/BoltThrower/ELF_boltthrower_03_attack.FBX`,
  attack2Path: `${B}/Elves/animation/BoltThrower/ELF_boltthrower_03_attack.FBX`,
  deathPath:   `${B}/Elves/animation/BoltThrower/ELF_boltthrower_04_death.FBX`,
};

// ── Mage animations (cast B + worker fallback) ────────────────────────────────
const MAGE_ANIM = {
  ...INF_ANIM,
  attack1Path: `${B}/Barbarians/animation/Mage/BRB_mage_11_cast_B.FBX`,
  attack2Path: `${B}/Barbarians/animation/Mage/BRB_mage_11_cast_B.FBX`,
};

// ── Public API ─────────────────────────────────────────────────────────────────
/**
 * Returns all FBX paths and the render scale for a given race + model category.
 * All paths are verified to exist in public/assets/Toon_RTS.
 */
export function getSoldierAssets(race: Race, cat: ModelCategory): SoldierAssets {
  switch (cat) {
    case 'cavalry':
      return {
        modelPath: CAVALRY_MODEL[race],
        ...CAVALRY_ANIM[race],
        scale: 0.01,
      };
    case 'catapult':
      return {
        modelPath: CATAPULT_MODEL[race],
        ...CATAPULT_ANIM[race],
        scale: 0.008,
      };
    case 'boltThrower':
      return {
        modelPath: BOLT_MODEL[race],
        ...BOLT_ANIM,
        scale: 0.009,
      };
    case 'infantry':
    default:
      return {
        modelPath: INFANTRY_MODEL[race],
        ...INF_ANIM,
        scale: 0.01,
      };
  }
}

/** Mage variant: infantry model + mage cast animations */
export function getMageAssets(race: Race): SoldierAssets {
  return {
    modelPath: INFANTRY_MODEL[race],
    ...MAGE_ANIM,
    scale: 0.01,
  };
}
