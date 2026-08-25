import assert from 'node:assert/strict';
import { getCombatStats } from '../src/game/data/CombatStats.ts';
import { calculatePursuitPoint } from '../src/game/physics/regimentCombatMotion.ts';

const lead = calculatePursuitPoint({
  pursuerPosition: [0, 0, 0],
  targetPosition: [12, 0, 0],
  previousTargetPosition: [11.8, 0, 0],
  previousTargetElapsed: 0.95,
  elapsed: 1,
  pursuerSpeed: 4.5,
  engagementRange: 6,
});

assert.equal(lead.arrived, false);
assert.ok(lead.predictionTime > 0);
assert.ok(lead.predictionTime <= 1.2);
assert.ok(lead.point[0] > 12, 'a moving target should receive a forward lead point');
assert.ok(
  lead.point[0] - 12 <= 4.5 * 1.2 * 0.75 + 0.000_001,
  'the lead must remain bounded',
);

const arrived = calculatePursuitPoint({
  pursuerPosition: [0, 0, 0],
  targetPosition: [5, 0, 0],
  previousTargetPosition: [4, 0, 0],
  previousTargetElapsed: 0.95,
  elapsed: 1,
  pursuerSpeed: 4.5,
  engagementRange: 6,
});

assert.equal(arrived.arrived, true);
assert.equal(arrived.predictionTime, 0);
assert.deepEqual(arrived.point, [5, 0, 0]);

const stationary = calculatePursuitPoint({
  pursuerPosition: [0, 0, 0],
  targetPosition: [12, 0, 0],
  previousTargetPosition: [12, 0, 0],
  previousTargetElapsed: 0.95,
  elapsed: 1,
  pursuerSpeed: 4.5,
  engagementRange: 6,
});

assert.equal(stationary.predictionTime, 0);
assert.deepEqual(stationary.point, [12, 0, 0]);
assert.equal(getCombatStats('swordsmen').role, 'melee');
assert.equal(getCombatStats('archers').role, 'ranged');
assert.equal(getCombatStats('catapult').role, 'siege');

console.log('Melee pursuit AI test passed.');