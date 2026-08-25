import type { WarZoneObstacle } from './warZoneData';

type Point = [number, number, number];

export function activeWarZoneObstacles(obstacles: WarZoneObstacle[]) {
  return obstacles.filter((obstacle) => !obstacle.destroyed && obstacle.health > 0);
}

function toObstacleLocal(point: Point, obstacle: WarZoneObstacle) {
  const dx = point[0] - obstacle.position[0];
  const dz = point[2] - obstacle.position[2];
  const cos = Math.cos(obstacle.rotation);
  const sin = Math.sin(obstacle.rotation);
  return {
    x: dx * cos + dz * sin,
    z: -dx * sin + dz * cos,
  };
}

/**
 * All tactical tests use this same oriented rectangle as the invisible Rapier
 * cuboid in WarZoneMap. A shared footprint keeps the rendered cover, collision,
 * sight blocking, and local steering in agreement.
 */
function segmentIntersectsFootprint(
  from: Point,
  to: Point,
  obstacle: WarZoneObstacle,
  padding = 0,
) {
  const start = toObstacleLocal(from, obstacle);
  const end = toObstacleLocal(to, obstacle);
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const halfX = Math.max(0.1, obstacle.footprint[0] + padding);
  const halfZ = Math.max(0.1, obstacle.footprint[1] + padding);
  let enter = 0;
  let exit = 1;

  const clip = (origin: number, delta: number, halfExtent: number) => {
    if (Math.abs(delta) < 0.000001) {
      return origin >= -halfExtent && origin <= halfExtent;
    }
    const t1 = (-halfExtent - origin) / delta;
    const t2 = (halfExtent - origin) / delta;
    enter = Math.max(enter, Math.min(t1, t2));
    exit = Math.min(exit, Math.max(t1, t2));
    return enter <= exit;
  };

  return clip(start.x, dx, halfX) && clip(start.z, dz, halfZ);
}

export function hasWarZoneLineOfSight(
  from: Point,
  to: Point,
  obstacles: WarZoneObstacle[],
) {
  return !activeWarZoneObstacles(obstacles).some(
    (obstacle) => obstacle.blocksSight && segmentIntersectsFootprint(from, to, obstacle, 0.35),
  );
}

export function findBlockingWarZoneObstacle(
  from: Point,
  to: Point,
  obstacles: WarZoneObstacle[],
) {
  return activeWarZoneObstacles(obstacles).find(
    (obstacle) => obstacle.blocksMovement && segmentIntersectsFootprint(from, to, obstacle, 1.25),
  );
}

function pointInsideObstacle(point: Point, obstacle: WarZoneObstacle, padding = 1.25) {
  const local = toObstacleLocal(point, obstacle);
  return Math.abs(local.x) < obstacle.footprint[0] + padding
    && Math.abs(local.z) < obstacle.footprint[1] + padding;
}

/** Finds an intact piece of War Zone cover at a terrain-clicked position. */
export function findWarZoneObstacleAtPoint(
  point: Point,
  obstacles: WarZoneObstacle[],
  padding = 0.5,
) {
  return obstacles.find(
    (obstacle) => !obstacle.destroyed
      && obstacle.blocksMovement
      && pointInsideObstacle(point, obstacle, padding),
  );
}

/**
 * A lightweight steering fallback for regiment-scale movement. It preserves
 * the direct route when clear, then tries both sides of the first blocker so
 * units can flow around cover without a full navmesh.
 */
export function resolveWarZoneMovement(
  from: Point,
  target: Point,
  step: number,
  obstacles: WarZoneObstacle[],
) {
  const dx = target[0] - from[0];
  const dz = target[2] - from[2];
  const distance = Math.sqrt(dx * dx + dz * dz);
  if (distance < 0.0001) return from;
  const ratio = Math.min(1, step / distance);
  const direct: Point = [from[0] + dx * ratio, from[1], from[2] + dz * ratio];
  const blocker = findBlockingWarZoneObstacle(from, direct, obstacles);
  if (!blocker && !activeWarZoneObstacles(obstacles).some((o) => pointInsideObstacle(direct, o))) {
    return direct;
  }

  const forwardX = dx / distance;
  const forwardZ = dz / distance;
  const nx = -forwardZ;
  const nz = forwardX;
  const direction = (x: number, z: number): Point => {
    const length = Math.sqrt(x * x + z * z);
    return [from[0] + (x / length) * step, from[1], from[2] + (z / length) * step];
  };
  const candidates: Point[] = [
    direction(forwardX + nx * 1.6, forwardZ + nz * 1.6),
    direction(forwardX - nx * 1.6, forwardZ - nz * 1.6),
    direction(nx, nz),
    direction(-nx, -nz),
  ];
  const live = activeWarZoneObstacles(obstacles);
  return candidates.find((candidate) =>
    !live.some((obstacle) => pointInsideObstacle(candidate, obstacle)) &&
    !findBlockingWarZoneObstacle(from, candidate, obstacles),
  ) ?? from;
}