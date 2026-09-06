/**
 * Scripted game steps: menu → army → spawn (preparation) → move order → victory.
 * Uses the existing gameStore SSOT. REST session calls are fire-and-forget.
 */
import assert from 'node:assert/strict';
import { useGameStore } from '../src/game/store/gameStore.ts';
import { FACTION_UNITS } from '../src/game/data/FactionData.ts';

const game = useGameStore;

game.getState().resetGame();
assert.equal(game.getState().phase, 'menu', 'step 1: menu');
assert.equal(game.getState().sessionId, null, 'fresh session is empty');

game.getState().setSelectedRace('WesternKingdoms');
game.getState().setEnemyRace('Orcs');
game.getState().setDifficulty('normal');
game.getState().setPhase('setup');
assert.equal(game.getState().phase, 'setup', 'step 2: army builder');

for (const unit of FACTION_UNITS.Crusade) {
  assert.notEqual(unit.type, 'meshyWarrior', `${unit.name} must not be a Meshy play unit`);
}

game.getState().addToPlayerArmy({ unitType: 'swordsmen' });
game.getState().addToPlayerArmy({ unitType: 'cavalry' });
game.getState().addToPlayerArmy({ unitType: 'archers' });
game.getState().addToPlayerArmy({ unitType: 'meshyWarrior' });
assert.equal(
  game.getState().playerArmy.length,
  3,
  'Meshy slots are rejected; Toon RTS cavalry/archers/swords remain',
);

game.getState().spawnArmies();
const afterSpawn = game.getState();
assert.equal(afterSpawn.phase, 'preparation', 'step 3: spawn enters preparation');
assert.ok(afterSpawn.units.length >= 3, 'player + AI regiments spawned');
assert.equal(
  afterSpawn.units.filter(u => u.type === 'meshyWarrior').length,
  0,
  'no Meshy bodies on the field',
);
assert.ok(afterSpawn.units.some(u => u.type === 'cavalry'), 'cavalry regiment present');
assert.ok(afterSpawn.units.some(u => u.type === 'archers'), 'archer regiment present for projectiles');

const playerIds = afterSpawn.units.filter(u => u.teamId === 1).map(u => u.id);
game.getState().issueMove(playerIds, [4, 0, -12]);
const mover = game.getState().units.find(u => u.id === playerIds[0]);
assert.deepEqual(mover?.targetPosition, [4, 0, -12], 'step 4: move order writes targetPosition');
assert.equal(mover?.state, 'move', 'move order sets regiment state');

game.getState().setPhase('battle');
assert.equal(game.getState().phase, 'battle', 'step 5: battle');

game.getState().setPhase('victory');
assert.equal(game.getState().phase, 'victory', 'step 6: victory');

game.getState().resetGame();
assert.equal(game.getState().phase, 'menu', 'reset returns to menu');
assert.equal(game.getState().units.length, 0, 'reset clears units');
assert.equal(game.getState().sessionId, null, 'reset clears REST session');

console.log('Game step script passed.');
