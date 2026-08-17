/**
 * checkFbxPaths — dev-only startup check for every FBX path in ToonRTSManifest.
 *
 * Fires a HEAD request for each unique path so any missing file surfaces in the
 * browser console immediately on load, before a soldier ever tries to animate.
 *
 * Tree-shaken out of production builds because the call site is guarded by
 * `import.meta.env.DEV`.
 */

import { getSoldierAssets, getMageAssets } from './ToonRTSManifest';
import type { Race }          from '@/game/store/gameStore';
import type { ModelCategory } from '@/game/data/UnitRoster';

const RACES: Race[]           = ['Orcs', 'Elves', 'WesternKingdoms', 'Dwarves', 'Barbarians', 'Undead'];
const CATEGORIES: ModelCategory[] = ['infantry', 'cavalry', 'catapult', 'boltThrower'];

/** Key fields that are FBX paths inside a SoldierAssets object */
const PATH_KEYS = ['modelPath', 'idlePath', 'runPath', 'attack1Path', 'attack2Path', 'deathPath'] as const;

async function headExists(path: string): Promise<boolean> {
  try {
    const res = await fetch(path, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Call once at app startup in dev mode.
 * Logs a summary to the console; each missing file gets a dedicated warning.
 */
export async function checkFbxPaths(): Promise<void> {
  // Collect every unique URL the manifest can produce
  const seen  = new Map<string, string>();   // path → human label

  function track(label: string, path: string) {
    if (!seen.has(path)) seen.set(path, label);
  }

  for (const race of RACES) {
    for (const cat of CATEGORIES) {
      const assets = getSoldierAssets(race, cat);
      for (const key of PATH_KEYS) {
        track(`[${cat}/${race}] ${key}`, assets[key]);
      }
    }
    // Mage variant
    const mage = getMageAssets(race);
    for (const key of PATH_KEYS) {
      track(`[mage/${race}] ${key}`, mage[key]);
    }
  }

  const total   = seen.size;
  const missing: Array<{ label: string; path: string }> = [];

  // Run HEAD requests in parallel (batches of 10 to avoid overwhelming the dev server)
  const entries = [...seen.entries()];
  const BATCH   = 10;

  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async ([path, label]) => ({ path, label, ok: await headExists(path) }))
    );
    for (const { path, label, ok } of results) {
      if (!ok) missing.push({ label, path });
    }
  }

  if (missing.length === 0) {
    console.info(
      `%c[FBX check] ✅ All ${total} unique FBX paths resolved — no T-pose risk.`,
      'color: #4caf50; font-weight: bold'
    );
  } else {
    console.warn(
      `%c[FBX check] ❌ ${missing.length}/${total} FBX path(s) MISSING — soldiers using these will T-pose!`,
      'color: #f44336; font-weight: bold'
    );
    for (const { label, path } of missing) {
      console.warn(`  MISSING ${label}\n          ${path}`);
    }
    console.warn(
      '%c[FBX check] Fix: update ToonRTSManifest.ts paths or add the files under public/assets/Toon_RTS/',
      'color: #ff9800'
    );
  }
}
