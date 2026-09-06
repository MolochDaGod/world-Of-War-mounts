/**
 * Yuka-style steering helpers for regiment roots.
 * Vehicle math only — CombatSystem still owns damage, mixer stays on the kit.
 * Rings match grudge-ai-brains AGGRO_CONFIG (metres).
 */

export const AGGRO_RINGS = {
  detection: 25,
  aggro: 15,
  leash: 50,
} as const;

export function horizDist(
  a: [number, number, number],
  b: [number, number, number],
): number {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return Math.hypot(dx, dz);
}

/** Seek: unit vector toward target. */
export function seekDir(
  from: [number, number, number],
  to: [number, number, number],
): [number, number] {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const d = Math.hypot(dx, dz);
  if (d < 1e-4) return [0, 0];
  return [dx / d, dz / d];
}

/** Arrive: slow inside radius (Yuka ArriveBehavior). */
export function arriveScale(dist: number, slowRadius: number): number {
  if (slowRadius <= 0 || dist >= slowRadius) return 1;
  return Math.max(0.15, dist / slowRadius);
}

/**
 * Separation from same-team neighbours (Yuka Separation overlay).
 * Returns a steering offset in XZ; caller normalizes after mixing with seek.
 */
export function separateXZ(
  self: [number, number, number],
  others: Array<[number, number, number]>,
  radius: number,
): [number, number] {
  let sx = 0;
  let sz = 0;
  let n = 0;
  for (const o of others) {
    const dx = self[0] - o[0];
    const dz = self[2] - o[2];
    const d = Math.hypot(dx, dz);
    if (d < 1e-4 || d > radius) continue;
    const w = (radius - d) / radius;
    sx += (dx / d) * w;
    sz += (dz / d) * w;
    n++;
  }
  if (!n) return [0, 0];
  return [sx / n, sz / n];
}

/** Mix seek + separation, then normalize. */
export function mixSteer(
  seek: [number, number],
  sep: [number, number],
  sepWeight = 0.35,
): [number, number] {
  const x = seek[0] + sep[0] * sepWeight;
  const z = seek[1] + sep[1] * sepWeight;
  const d = Math.hypot(x, z);
  if (d < 1e-4) return seek;
  return [x / d, z / d];
}
