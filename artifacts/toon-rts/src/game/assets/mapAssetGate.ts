import type { UnitData } from '@/game/store/gameStore';
import {
  AnimalModels,
  CaneModels,
  ChestModels,
  HammerModels,
  MedievalModels,
  MineModels,
  MountainModels,
  SwordModels,
  TreeModels,
  VolcanoModels,
} from './CraftpixManifest';
import { getMageAssets, getSoldierAssets } from './ToonRTSManifest';
import { MESHY_PATHS } from '@/game/characters/MeshySoldier';
import { CAPTAIN_JOHN_WAYNE_PATHS } from '@/game/characters/CaptainJohnWayneMesh';
import { PIRATE_KING_PATHS } from '@/game/characters/PirateKingMesh';
import { SCOURGE_FAITH_BEARER_PATHS } from '@/game/characters/ScourgeFaithBearerMesh';
import { COMMANDER_BY_ID } from '@/game/data/CommanderDefs';
import { EQUIPMENT_GLB } from '@/game/data/UnitMeshConfig';
import { WAR_ZONE_REQUIRED_ASSETS } from '@/game/world/WarZoneManifest';

export interface AssetLoadProgress {
  completed: number;
  total: number;
  message: string;
}

function collectUrls(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectUrls);
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectUrls);
  return [];
}

function categoryForUnit(unit: UnitData): 'infantry' | 'cavalry' | 'catapult' | 'boltThrower' {
  if (unit.type === 'cavalry' || unit.type === 'heavyCavalry') return 'cavalry';
  if (unit.type === 'catapult' || unit.type === 'grieeGlee') return 'catapult';
  if (unit.type === 'boltThrower') return 'boltThrower';
  return 'infantry';
}

function unitAssetUrls(unit: UnitData): string[] {
  const commander = unit.isCommander && unit.commanderArchetype
    ? COMMANDER_BY_ID[unit.commanderArchetype]
    : null;

  // These branches mirror BattleArmy's slot-zero commander renderer. A custom
  // hero replaces the normal FBX soldier entirely, so only its own files belong
  // in the readiness set.
  if (commander?.heroComponentId === 'captain_john_wayne') return collectUrls(CAPTAIN_JOHN_WAYNE_PATHS);
  if (commander?.heroComponentId === 'pirate_king') return collectUrls(PIRATE_KING_PATHS);
  if (commander?.heroComponentId === 'scourge_faith_bearer') {
    return collectUrls(SCOURGE_FAITH_BEARER_PATHS);
  }
  if (commander?.heroModelPath) {
    return [commander.heroModelPath, commander.heroTexturePath].filter(
      (path): path is string => Boolean(path),
    );
  }

  if (unit.type === 'meshyWarrior') return collectUrls(MESHY_PATHS);
  if (unit.type === 'skeletonWarrior') return ['/assets/characters/glb/skeleton_warrior.glb'];
  if (unit.type === 'grieeGlee') {
    return [
      '/assets/characters/glb/graatorc.glb',
      '/assets/characters/glb/goblin_crew.glb',
    ];
  }
  const assets = unit.type === 'mage'
    ? getMageAssets(unit.race)
    : getSoldierAssets(unit.race, categoryForUnit(unit));
  // ToonRTSSoldierInner always loads the race equipment GLB alongside the FBX
  // model/animations, including commanders that use the normal soldier renderer.
  return [...collectUrls(assets), EQUIPMENT_GLB[unit.race]];
}

const BATTLEFIELD_URLS = [
  ...collectUrls(TreeModels),
  ...collectUrls(MountainModels),
  ...collectUrls(VolcanoModels),
  ...collectUrls(MineModels),
  ...collectUrls(ChestModels),
  ...collectUrls(SwordModels),
  ...collectUrls(HammerModels),
  ...collectUrls(CaneModels),
  ...collectUrls(MedievalModels),
  ...collectUrls(AnimalModels),
];

const ARENA_URLS = [
  '/assets/environments/arena_warzone.glb',
  ...WAR_ZONE_REQUIRED_ASSETS,
];

export function getRequiredBattleAssetUrls(
  mapType: 'battlefield' | 'arena',
  units: UnitData[],
) {
  return [...new Set([
    ...(mapType === 'arena' ? ARENA_URLS : BATTLEFIELD_URLS),
    ...units.flatMap(unitAssetUrls),
  ])];
}

/**
 * Fetches the selected battlefield's real static files before the preparation
 * timer can begin. The browser cache makes the subsequent R3F loader requests
 * cheap, while this explicit list prevents a cached/empty LoadingManager queue
 * from falsely declaring the map ready.
 */
export async function preloadBattleAssets(
  mapType: 'battlefield' | 'arena',
  units: UnitData[],
  onProgress: (progress: AssetLoadProgress) => void,
  signal: AbortSignal,
) {
  const urls = getRequiredBattleAssetUrls(mapType, units);
  const total = urls.length;
  let completed = 0;
  const failures: string[] = [];
  let cursor = 0;

  onProgress({ completed, total, message: 'Preparing battlefield assets…' });

  const loadNext = async () => {
    while (!signal.aborted) {
      const index = cursor++;
      if (index >= urls.length) return;
      const url = urls[index];
      try {
        const response = await fetch(url, { signal, cache: 'force-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        // Read the whole body so this is a genuine content load, not a HEAD probe.
        await response.arrayBuffer();
      } catch (error) {
        if (signal.aborted) return;
        failures.push(`${url} (${error instanceof Error ? error.message : 'failed to fetch'})`);
      } finally {
        completed += 1;
        onProgress({
          completed,
          total,
          message: `Loading map assets ${completed}/${total}`,
        });
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(4, Math.max(1, urls.length)) }, () => loadNext()),
  );

  if (signal.aborted) return;
  if (failures.length > 0) {
    throw new Error(`Required asset load failed: ${failures.slice(0, 3).join(', ')}`);
  }
}