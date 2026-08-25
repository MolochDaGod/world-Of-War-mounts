import assert from 'node:assert/strict';
import { findBlockingWarZoneObstacle, hasWarZoneLineOfSight } from '../src/game/world/warZoneGeometry.ts';
import { applyWarZoneObstacleDamage } from '../src/game/world/warZoneState.ts';
import type { WarZoneObstacle } from '../src/game/world/warZoneData.ts';

const wall: WarZoneObstacle = {
  id: 'rotated-test-wall',
  kind: 'wall',
  pieceId: 'wall_stone',
  position: [0, 0, 0],
  rotation: Math.PI / 2,
  scale: 1,
  footprint: [4, 2],
  health: 500,
  maxHealth: 500,
  blocksSight: true,
  blocksMovement: true,
  destroyed: false,
};

const from: [number, number, number] = [-12, 0, 0];
const to: [number, number, number] = [12, 0, 0];

assert.equal(hasWarZoneLineOfSight(from, to, [wall]), false, 'intact rotated cover blocks sight');
assert.equal(findBlockingWarZoneObstacle(from, to, [wall])?.id, wall.id, 'intact rotated cover blocks movement');

const destroyed = applyWarZoneObstacleDamage([wall], new Map([[wall.id, wall.health]]));
assert.equal(destroyed[0].destroyed, true, 'lethal siege damage marks cover destroyed');
assert.equal(destroyed[0].health, 0, 'destroyed cover has no health remaining');
assert.equal(hasWarZoneLineOfSight(from, to, destroyed), true, 'destroyed cover no longer blocks sight');
assert.equal(findBlockingWarZoneObstacle(from, to, destroyed), undefined, 'destroyed cover no longer blocks movement');

console.log('War Zone destruction state test passed.');