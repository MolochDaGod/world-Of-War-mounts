import type { UnitData } from '../store/gameStore';

export type WorldPosition = [number, number, number];

export interface ChargeSweepTarget {
  id: string;
  teamId: 1 | 2;
  position: WorldPosition;
}

/** A charge is a movement action, so it must obey the same locks as marching. */
export function chargeMovementAllowed(
  standGround: boolean | undefined,
  formationLockUntil: number | undefined,
  elapsed: number,
) {
  return !standGround && (formationLockUntil ?? 0) <= elapsed;
}

/** Shared non-barrier damage reduction used by regular and charge melee hits. */
export function combatDefenseMultiplier({
  shieldwall,
  standGround,
  shieldWallUntil,
  commanderDefenseMultiplier = 1,
  elapsed,
}: {
  shieldwall: boolean;
  standGround: boolean | undefined;
  shieldWallUntil: number | undefined;
  commanderDefenseMultiplier?: number;
  elapsed: number;
}) {
  let multiplier = 1;
  if (shieldwall) multiplier *= 0.80;
  if (standGround) multiplier *= 0.75;
  multiplier *= 1 / commanderDefenseMultiplier;
  if ((shieldWallUntil ?? 0) > elapsed) multiplier *= 0.55;
  return multiplier;
}

/**
 * Put the cavalry's exit point beyond the target, so a charge crosses a rank
 * instead of stopping at its front edge.
 */
export function chargeExitPosition(
  from: WorldPosition,
  target: WorldPosition,
  exitDistance: number,
): WorldPosition {
  const dx = target[0] - from[0];
  const dz = target[2] - from[2];
  const length = Math.hypot(dx, dz);
  if (length < 0.0001) return [target[0], target[1], target[2] + exitDistance];
  return [
    target[0] + (dx / length) * exitDistance,
    target[1],
    target[2] + (dz / length) * exitDistance,
  ];
}

/** Squared XZ distance between a point and a finite movement segment. */
export function pointSegmentDistanceSq(
  point: WorldPosition,
  start: WorldPosition,
  end: WorldPosition,
) {
  const sx = end[0] - start[0];
  const sz = end[2] - start[2];
  const lengthSq = sx * sx + sz * sz;
  if (lengthSq < 0.000001) {
    const dx = point[0] - start[0];
    const dz = point[2] - start[2];
    return dx * dx + dz * dz;
  }
  const t = Math.max(0, Math.min(1, (
    (point[0] - start[0]) * sx + (point[2] - start[2]) * sz
  ) / lengthSq));
  const dx = point[0] - (start[0] + sx * t);
  const dz = point[2] - (start[2] + sz * t);
  return dx * dx + dz * dz;
}

/**
 * Finds only new enemy regiments intersected by a cavalry movement segment.
 * The caller owns the hit set so each target can be damaged once per charge.
 */
export function sweptChargeTargets<T extends ChargeSweepTarget>(
  attacker: Pick<UnitData, 'teamId'>,
  start: WorldPosition,
  end: WorldPosition,
  candidates: T[],
  hitIds: ReadonlySet<string>,
  width: number,
) {
  const maxDistanceSq = width * width;
  return candidates.filter(target => (
    target.teamId !== attacker.teamId
    && !hitIds.has(target.id)
    && pointSegmentDistanceSq(target.position, start, end) <= maxDistanceSq
  ));
}