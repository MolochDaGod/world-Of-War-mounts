import type { AbilityType } from '../store/gameStore';

/**
 * The visual components use the same durations when deciding when to remove
 * their cast. Keeping the values here gives the store and the dev stress test
 * one deterministic expiration contract without importing any R3F code.
 */
export const ABILITY_VFX_DURATIONS_MS: Record<AbilityType, number> = {
  ice: 2_500,
  lightning: 1_200,
  meteor: 3_500,
  fire: 2_000,
  wind: 3_500,
  poison: 3_500,
  thunder: 1_800,
  flame_blast: 2_800,
};

export const BATTLE_MEMORY_STRESS_CONFIG = {
  warmupBattles: 1,
  measuredBattles: 5,
  castsPerBattle: 20,
  maxActiveVfx: 20,
  maxHeapGrowthBytes: 32 * 1024 * 1024,
  runtimeMountTimeoutMs: 10_000,
  runtimeUnmountTimeoutMs: 1_000,
  runtimePollMs: 50,
  vfxRenderWaitMs: 100,
  vfxMountTimeoutMs: 1_000,
  vfxCleanupTimeoutMs: 1_000,
} as const;

export type ActiveCast = {
  id: string;
  type: AbilityType;
  startTime: number;
};

export function getAbilityVfxDurationMs(type: AbilityType): number {
  return ABILITY_VFX_DURATIONS_MS[type];
}

export function removeExpiredCasts<T extends ActiveCast>(
  casts: T[],
  now: number,
): T[] {
  return casts.filter(cast => now - cast.startTime < getAbilityVfxDurationMs(cast.type));
}

export function getTransientResourceCount(snapshot: {
  activeCasts: unknown[];
  totems: unknown[];
  bountyBursts: unknown[];
}): number {
  return snapshot.activeCasts.length + snapshot.totems.length + snapshot.bountyBursts.length;
}

export type MemorySample = {
  label: string;
  usedJSHeapSize: number;
};

export function readClientHeapSample(label: string): MemorySample | null {
  if (typeof performance === 'undefined') return null;
  const memory = (performance as Performance & {
    memory?: { usedJSHeapSize: number };
  }).memory;
  if (!memory || !Number.isFinite(memory.usedJSHeapSize)) return null;
  return { label, usedJSHeapSize: memory.usedJSHeapSize };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}