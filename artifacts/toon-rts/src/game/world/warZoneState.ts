import type { WarZoneObstacle } from './warZoneData.ts';

/**
 * Applies an already-aggregated damage set without mutating the obstacle seed.
 * Kept pure so combat batching and focused state tests exercise the same
 * destruction transition.
 */
export function applyWarZoneObstacleDamage(
  obstacles: WarZoneObstacle[],
  damageById: ReadonlyMap<string, number>,
) {
  let changed = false;
  const next = obstacles.map((obstacle) => {
    const amount = damageById.get(obstacle.id);
    if (!amount || amount <= 0 || obstacle.destroyed) return obstacle;
    const health = Math.max(0, obstacle.health - amount);
    changed = true;
    return { ...obstacle, health, destroyed: health <= 0 };
  });
  return changed ? next : obstacles;
}