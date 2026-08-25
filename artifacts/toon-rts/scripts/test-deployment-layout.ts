import assert from 'node:assert/strict';
import { layoutArmyPositions } from '../src/game/store/formationLayout.ts';
import type { RegimentSlot } from '../src/game/store/gameStore.ts';

const mixedArmy: RegimentSlot[] = [
  { unitType: 'archers' },
  { unitType: 'swordsmen' },
  { unitType: 'catapult' },
  { unitType: 'mage' },
  { unitType: 'heavyCavalry' },
];

const playerPositions = layoutArmyPositions(mixedArmy, 1);
assert.equal(playerPositions.length, mixedArmy.length);
assert.equal(playerPositions[0][2], 34, 'first card archer must remain on ranged line');
assert.equal(playerPositions[1][2], 20, 'second card swordsmen must remain on melee line');
assert.equal(playerPositions[2][2], 48, 'third card catapult must remain on siege line');
assert.equal(playerPositions[3][2], 34, 'fourth card mage must remain on ranged line');
assert.equal(playerPositions[4][2], 20, 'fifth card cavalry must remain on melee line');

const enemyPositions = layoutArmyPositions(mixedArmy, 2);
assert.deepEqual(enemyPositions.map(position => position[2]), [-34, -20, -48, -34, -20]);
console.log('Deployment layout keeps mixed card order while assigning correct battlefield lanes.');