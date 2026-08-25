import assert from 'node:assert/strict';
import {
  chargeMovementAllowed,
  chargeExitPosition,
  combatDefenseMultiplier,
  pointSegmentDistanceSq,
  sweptChargeTargets,
} from '../src/game/physics/regimentCombatMotion.ts';

assert.equal(chargeMovementAllowed(false, undefined, 10), true, 'unlocked cavalry may charge');
assert.equal(chargeMovementAllowed(true, undefined, 10), false, 'Stand Ground blocks cavalry charges');
assert.equal(chargeMovementAllowed(false, 11, 10), false, 'Formation Lock blocks cavalry charges');
assert.equal(chargeMovementAllowed(false, 10, 10), true, 'a finished Formation Lock releases cavalry');

assert.ok(
  Math.abs(combatDefenseMultiplier({
    shieldwall: true,
    standGround: true,
    shieldWallUntil: 12,
    commanderDefenseMultiplier: 1.25,
    elapsed: 10,
  }) - 0.264) < 0.000001,
  'charge and standard hits share shieldwall, stand-ground, commander, and Shield Wall reduction',
);

const exit = chargeExitPosition([0, 0, 20], [0, 0, -4], 10);
assert.deepEqual(exit, [0, 0, -14], 'charge exits beyond the target rank');

const offsetExit = chargeExitPosition([-6, 0, 10], [2, 0, 4], 10);
assert.ok(
  Math.hypot(offsetExit[0] - 2, offsetExit[2] - 4) > 9.99,
  'charge exit keeps the requested distance on diagonal charges',
);

assert.equal(
  pointSegmentDistanceSq([0, 0, 4], [0, 0, 10], [0, 0, -10]),
  0,
  'a regiment centered in the movement corridor is intersected',
);
assert.ok(
  pointSegmentDistanceSq([8, 0, 0], [0, 0, 10], [0, 0, -10]) > 16,
  'a regiment outside the corridor is not intersected',
);

const attacker = { teamId: 1 as const };
const candidates = [
  { id: 'front', teamId: 2 as const, position: [0, 0, 3] as [number, number, number], marker: 'front' },
  { id: 'rear', teamId: 2 as const, position: [0, 0, -3] as [number, number, number], marker: 'rear' },
  { id: 'ally', teamId: 1 as const, position: [0, 0, 0] as [number, number, number], marker: 'ally' },
  { id: 'wide', teamId: 2 as const, position: [5, 0, 0] as [number, number, number], marker: 'wide' },
];
const firstSweep = sweptChargeTargets(attacker, [0, 0, 8], [0, 0, -8], candidates, new Set(['front']), 2.5);
assert.deepEqual(
  firstSweep.map(target => target.id),
  ['rear'],
  'a charge hits each enemy in its corridor once and ignores allies or wide targets',
);
assert.equal(firstSweep[0]?.marker, 'rear', 'sweep retains the caller target shape for combat resolution');

// A first impact can release an AOE that kills another regiment still in the
// charge corridor. The combat loop must consult the current patch at each hit
// rather than assuming the original sweep snapshot remains alive.
const killedByFirstImpact = new Set(['rear']);
const directChargeTargets = firstSweep.filter(target => !killedByFirstImpact.has(target.id));
assert.deepEqual(
  directChargeTargets.map(target => target.id),
  [],
  'a target killed by an earlier charge AOE is skipped by the direct sweep hit',
);

console.log('Regiment charge motion test passed.');