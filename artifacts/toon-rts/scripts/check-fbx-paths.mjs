/**
 * check-fbx-paths.mjs
 *
 * CLI verification for every FBX path referenced by ToonRTSManifest.
 * Runs against the local filesystem — no server needed.
 *
 * Usage:
 *   node scripts/check-fbx-paths.mjs
 *
 * Exit codes:
 *   0 — all paths present
 *   1 — one or more paths missing (paths printed to stderr)
 */

import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dir   = dirname(fileURLToPath(import.meta.url));
const PUBLIC  = join(__dir, '..', 'public');   // artifacts/toon-rts/public
const B       = join(PUBLIC, 'assets', 'Toon_RTS');
const DWF_W   = join(B, 'Dwarves', 'animation', 'Worker');

// ── Helpers ────────────────────────────────────────────────────────────────────
/** Convert a manifest URL path like /assets/Toon_RTS/... to an absolute FS path */
function toFs(urlPath) {
  // urlPath starts with /assets/Toon_RTS/...
  const rel = urlPath.replace(/^\/assets\/Toon_RTS\//, '');
  return join(B, rel);
}

// ── Replicate every path constant from ToonRTSManifest.ts ─────────────────────

const RACES = ['Orcs', 'Elves', 'WesternKingdoms', 'Dwarves', 'Barbarians', 'Undead'];

const INFANTRY_MODEL = {
  Orcs:            `/assets/Toon_RTS/Orcs/models/ORC_Characters_Customizable.FBX`,
  Elves:           `/assets/Toon_RTS/Elves/models/ELF_Characters_customizable.FBX`,
  WesternKingdoms: `/assets/Toon_RTS/WesternKingdoms/models/WK_Characters_customizable.FBX`,
  Dwarves:         `/assets/Toon_RTS/Dwarves/models/DWF_Characters_customizable.FBX`,
  Barbarians:      `/assets/Toon_RTS/Barbarians/models/BRB_Characters_customizable.FBX`,
  Undead:          `/assets/Toon_RTS/Undead/models/UD_Characters_customizable.FBX`,
};

const CAVALRY_MODEL = {
  Orcs:            `/assets/Toon_RTS/Orcs/models/ORC_Cavalry_Customizable.FBX`,
  Elves:           `/assets/Toon_RTS/Elves/models/ELF_Cavalry_customizable.FBX`,
  WesternKingdoms: `/assets/Toon_RTS/WesternKingdoms/models/WK_Cavalry_customizable.FBX`,
  Dwarves:         `/assets/Toon_RTS/Dwarves/models/DWF_Cavalry_customizable.FBX`,
  Barbarians:      `/assets/Toon_RTS/Barbarians/models/BRB_Cavalry_customizable.FBX`,
  Undead:          `/assets/Toon_RTS/Undead/models/UD_Cavalry_customizable.FBX`,
};

const CATAPULT_MODEL = {
  Orcs:            `/assets/Toon_RTS/Orcs/models/ORC_Catapult.FBX`,
  WesternKingdoms: `/assets/Toon_RTS/WesternKingdoms/models/WK_Catapult.FBX`,
  Elves:           `/assets/Toon_RTS/WesternKingdoms/models/WK_Catapult.FBX`,
  Dwarves:         `/assets/Toon_RTS/Orcs/models/ORC_Catapult.FBX`,
  Barbarians:      `/assets/Toon_RTS/Orcs/models/ORC_Catapult.FBX`,
  Undead:          `/assets/Toon_RTS/WesternKingdoms/models/WK_Catapult.FBX`,
};

const BOLT_MODEL = {
  Elves:           `/assets/Toon_RTS/Elves/models/ELF_BoltThrower.FBX`,
  Orcs:            `/assets/Toon_RTS/Elves/models/ELF_BoltThrower.FBX`,
  WesternKingdoms: `/assets/Toon_RTS/Elves/models/ELF_BoltThrower.FBX`,
  Dwarves:         `/assets/Toon_RTS/Elves/models/ELF_BoltThrower.FBX`,
  Barbarians:      `/assets/Toon_RTS/Elves/models/ELF_BoltThrower.FBX`,
  Undead:          `/assets/Toon_RTS/Elves/models/ELF_BoltThrower.FBX`,
};

const INF_ANIM = {
  idlePath:    `/assets/Toon_RTS/Dwarves/animation/Worker/_idle.FBX`,
  runPath:     `/assets/Toon_RTS/Dwarves/animation/Worker/run.FBX`,
  attack1Path: `/assets/Toon_RTS/Dwarves/animation/Worker/DWF_worker_07_attack.FBX`,
  attack2Path: `/assets/Toon_RTS/Barbarians/animation/Spearman/BRB_spearman_07_attack.FBX`,
  deathPath:   `/assets/Toon_RTS/Dwarves/animation/Worker/DWF_worker_10_death_B.FBX`,
};

const ORC_CAV_ANIM = {
  idlePath:    `/assets/Toon_RTS/Orcs/animation/Cavalry/ORC_cavalry_01_idle.FBX`,
  runPath:     `/assets/Toon_RTS/Orcs/animation/Cavalry/ORC_cavalry_03_run.FBX`,
  attack1Path: `/assets/Toon_RTS/Dwarves/animation/Worker/DWF_worker_07_attack.FBX`,
  attack2Path: `/assets/Toon_RTS/Barbarians/animation/Spearman/BRB_spearman_07_attack.FBX`,
  deathPath:   `/assets/Toon_RTS/Orcs/animation/Cavalry/ORC_cavalry_10_death_B.FBX`,
};

const CAVALRY_ANIM = {
  Orcs:            ORC_CAV_ANIM,
  Elves: {
    idlePath:    `/assets/Toon_RTS/Elves/animation/Cavalry_Spear/ELF_cavalry_spear_05_combat_idle.FBX`,
    runPath:     `/assets/Toon_RTS/Elves/animation/Cavalry_Spear/ELF_cavalry_spear_04_charge.FBX`,
    attack1Path: `/assets/Toon_RTS/Elves/animation/Cavalry_Spear/ELF_cavalry_spear_07_attack.FBX`,
    attack2Path: `/assets/Toon_RTS/Elves/animation/Cavalry_Mage/ELF_cavalry_mage_08_attack_B.FBX`,
    deathPath:   `/assets/Toon_RTS/Elves/animation/Cavalry_Spear/ELF_cavalry_spear_10_death_A.FBX`,
  },
  WesternKingdoms: {
    idlePath:    `/assets/Toon_RTS/WesternKingdoms/animation/Cavalry/WK_cavalry_01_idle.FBX`,
    runPath:     `/assets/Toon_RTS/WesternKingdoms/animation/Cavalry/WK_cavalry_03_run.FBX`,
    attack1Path: `/assets/Toon_RTS/Dwarves/animation/Worker/DWF_worker_07_attack.FBX`,
    attack2Path: `/assets/Toon_RTS/Barbarians/animation/Spearman/BRB_spearman_07_attack.FBX`,
    deathPath:   `/assets/Toon_RTS/WesternKingdoms/animation/Cavalry/WK_cavalry_10_death_B.FBX`,
  },
  Dwarves: {
    idlePath:    `/assets/Toon_RTS/Dwarves/animation/Cavalry/DWF_cavalry_01_idle.FBX`,
    runPath:     `/assets/Toon_RTS/Dwarves/animation/Cavalry/DWF_cavalry_03_run.FBX`,
    attack1Path: `/assets/Toon_RTS/Dwarves/animation/Worker/DWF_worker_07_attack.FBX`,
    attack2Path: `/assets/Toon_RTS/Barbarians/animation/Spearman/BRB_spearman_07_attack.FBX`,
    deathPath:   `/assets/Toon_RTS/Dwarves/animation/Cavalry/DWF_cavalry_10_death_B.FBX`,
  },
  Barbarians: ORC_CAV_ANIM,
  Undead:     ORC_CAV_ANIM,
};

const ORC_CAT_ANIM = {
  idlePath:    `/assets/Toon_RTS/Orcs/animation/Catapult/ORC_catapult_01_idle.FBX`,
  runPath:     `/assets/Toon_RTS/Orcs/animation/Catapult/ORC_catapult_01_idle.FBX`,
  attack1Path: `/assets/Toon_RTS/Orcs/animation/Catapult/ORC_catapult_03_attack.FBX`,
  attack2Path: `/assets/Toon_RTS/Orcs/animation/Catapult/ORC_catapult_03_attack.FBX`,
  deathPath:   `/assets/Toon_RTS/Orcs/animation/Catapult/ORC_catapult_04_death.FBX`,
};

const WK_CAT_ANIM = {
  idlePath:    `/assets/Toon_RTS/WesternKingdoms/animation/Catapult/WK_catapult_01_idle.FBX`,
  runPath:     `/assets/Toon_RTS/WesternKingdoms/animation/Catapult/WK_catapult_01_idle.FBX`,
  attack1Path: `/assets/Toon_RTS/WesternKingdoms/animation/Catapult/WK_catapult_03_attack.FBX`,
  attack2Path: `/assets/Toon_RTS/WesternKingdoms/animation/Catapult/WK_catapult_03_attack.FBX`,
  deathPath:   `/assets/Toon_RTS/WesternKingdoms/animation/Catapult/WK_catapult_04_death.FBX`,
};

const CATAPULT_ANIM = {
  Orcs: ORC_CAT_ANIM, WesternKingdoms: WK_CAT_ANIM,
  Elves: WK_CAT_ANIM, Dwarves: ORC_CAT_ANIM, Barbarians: ORC_CAT_ANIM, Undead: WK_CAT_ANIM,
};

const BOLT_ANIM = {
  idlePath:    `/assets/Toon_RTS/Elves/animation/BoltThrower/ELF_boltthrower_01_idle.FBX`,
  runPath:     `/assets/Toon_RTS/Elves/animation/BoltThrower/ELF_boltthrower_01_idle.FBX`,
  attack1Path: `/assets/Toon_RTS/Elves/animation/BoltThrower/ELF_boltthrower_03_attack.FBX`,
  attack2Path: `/assets/Toon_RTS/Elves/animation/BoltThrower/ELF_boltthrower_03_attack.FBX`,
  deathPath:   `/assets/Toon_RTS/Elves/animation/BoltThrower/ELF_boltthrower_04_death.FBX`,
};

const MAGE_ANIM = {
  ...INF_ANIM,
  attack1Path: `/assets/Toon_RTS/Barbarians/animation/Mage/BRB_mage_11_cast_B.FBX`,
  attack2Path: `/assets/Toon_RTS/Barbarians/animation/Mage/BRB_mage_11_cast_B.FBX`,
};

// ── Build the full check list ─────────────────────────────────────────────────
/** @returns {Array<{label: string, urlPath: string}>} */
function buildCheckList() {
  const checks = [];

  function add(label, urlPath) {
    checks.push({ label, urlPath });
  }

  for (const race of RACES) {
    // infantry
    add(`[infantry/${race}] model`,   INFANTRY_MODEL[race]);
    add(`[infantry/${race}] idle`,    INF_ANIM.idlePath);
    add(`[infantry/${race}] run`,     INF_ANIM.runPath);
    add(`[infantry/${race}] attack1`, INF_ANIM.attack1Path);
    add(`[infantry/${race}] attack2`, INF_ANIM.attack2Path);
    add(`[infantry/${race}] death`,   INF_ANIM.deathPath);

    // cavalry
    add(`[cavalry/${race}] model`,   CAVALRY_MODEL[race]);
    add(`[cavalry/${race}] idle`,    CAVALRY_ANIM[race].idlePath);
    add(`[cavalry/${race}] run`,     CAVALRY_ANIM[race].runPath);
    add(`[cavalry/${race}] attack1`, CAVALRY_ANIM[race].attack1Path);
    add(`[cavalry/${race}] attack2`, CAVALRY_ANIM[race].attack2Path);
    add(`[cavalry/${race}] death`,   CAVALRY_ANIM[race].deathPath);

    // catapult
    add(`[catapult/${race}] model`,   CATAPULT_MODEL[race]);
    add(`[catapult/${race}] idle`,    CATAPULT_ANIM[race].idlePath);
    add(`[catapult/${race}] run`,     CATAPULT_ANIM[race].runPath);
    add(`[catapult/${race}] attack1`, CATAPULT_ANIM[race].attack1Path);
    add(`[catapult/${race}] attack2`, CATAPULT_ANIM[race].attack2Path);
    add(`[catapult/${race}] death`,   CATAPULT_ANIM[race].deathPath);

    // boltThrower
    add(`[boltThrower/${race}] model`,   BOLT_MODEL[race]);
    add(`[boltThrower/${race}] idle`,    BOLT_ANIM.idlePath);
    add(`[boltThrower/${race}] run`,     BOLT_ANIM.runPath);
    add(`[boltThrower/${race}] attack1`, BOLT_ANIM.attack1Path);
    add(`[boltThrower/${race}] attack2`, BOLT_ANIM.attack2Path);
    add(`[boltThrower/${race}] death`,   BOLT_ANIM.deathPath);

    // mage
    add(`[mage/${race}] model`,   INFANTRY_MODEL[race]);
    add(`[mage/${race}] idle`,    MAGE_ANIM.idlePath);
    add(`[mage/${race}] run`,     MAGE_ANIM.runPath);
    add(`[mage/${race}] attack1`, MAGE_ANIM.attack1Path);
    add(`[mage/${race}] attack2`, MAGE_ANIM.attack2Path);
    add(`[mage/${race}] death`,   MAGE_ANIM.deathPath);
  }

  return checks;
}

// ── Run checks ────────────────────────────────────────────────────────────────
const checks   = buildCheckList();
const missing  = [];
const seen     = new Set();  // deduplicate paths so each file is only stat'd once

console.log(`\n🔍 Checking ${checks.length} path references across 6 races × 5 categories…\n`);

for (const { label, urlPath } of checks) {
  if (seen.has(urlPath)) continue;
  seen.add(urlPath);

  const fsPath = toFs(urlPath);
  if (!existsSync(fsPath)) {
    missing.push({ label, urlPath, fsPath });
  }
}

const unique = seen.size;
if (missing.length === 0) {
  console.log(`✅  All ${unique} unique FBX paths exist on disk. No T-pose risk from missing files.\n`);
  process.exit(0);
} else {
  console.error(`❌  ${missing.length} of ${unique} unique FBX path(s) are MISSING:\n`);
  for (const { label, urlPath, fsPath } of missing) {
    console.error(`  MISSING  ${label}`);
    console.error(`           URL : ${urlPath}`);
    console.error(`           FS  : ${fsPath}\n`);
  }
  process.exit(1);
}
