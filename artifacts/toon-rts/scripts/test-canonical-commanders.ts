import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { COMMANDER_BY_ID, COMMANDER_ART } from '../src/game/data/CommanderDefs.ts';

const publicRoot = fileURLToPath(new URL('../public', import.meta.url));
const pirateKingPaths = [
  '/assets/characters/heroes/pirate_king/pk_char.glb',
  '/assets/characters/heroes/pirate_king/pk_idle.glb',
  '/assets/characters/heroes/pirate_king/pk_run.glb',
  '/assets/characters/heroes/pirate_king/pk_combo.glb',
  '/assets/characters/heroes/pirate_king/pk_charge.glb',
];
const captainJohnWaynePaths = [
  '/assets/characters/heroes/captain_john_wayne/jw_char.glb',
  '/assets/characters/heroes/captain_john_wayne/jw_idle.glb',
  '/assets/characters/heroes/captain_john_wayne/jw_run.glb',
  '/assets/characters/heroes/captain_john_wayne/jw_attack.glb',
  '/assets/characters/heroes/captain_john_wayne/jw_charge.glb',
  '/assets/characters/heroes/captain_john_wayne/jw_dead.glb',
];
const scourgeFaithBearerPaths = [
  '/assets/characters/heroes/scourge_faith_bearer/sfb_char.glb',
  '/assets/characters/heroes/scourge_faith_bearer/sfb_idle.glb',
  '/assets/characters/heroes/scourge_faith_bearer/sfb_run.glb',
  '/assets/characters/heroes/scourge_faith_bearer/sfb_attack.glb',
  '/assets/characters/heroes/scourge_faith_bearer/sfb_slam.glb',
  '/assets/characters/heroes/scourge_faith_bearer/sfb_dead.glb',
];

const john = COMMANDER_BY_ID.wk_champion;
const racalvin = COMMANDER_BY_ID.brb_champion;
const scourge = COMMANDER_BY_ID.ud_champion;

assert.equal(john?.name, 'Captain John Wayne');
assert.equal(john?.heroComponentId, 'captain_john_wayne');
assert.equal(racalvin?.name, 'Pirate King Racalvin');
assert.equal(racalvin?.heroComponentId, 'pirate_king');
assert.equal(scourge?.name, 'Scourge Faith Bearer');
assert.equal(scourge?.heroComponentId, 'scourge_faith_bearer');

for (const path of [
  john?.avatarPath,
  racalvin?.avatarPath,
  scourge?.avatarPath,
  COMMANDER_ART.emblem,
  COMMANDER_ART.containerFrame,
  ...captainJohnWaynePaths,
  ...pirateKingPaths,
  ...scourgeFaithBearerPaths,
]) {
  assert.ok(path, 'each canonical commander route must have a defined asset');
  assert.ok(existsSync(`${publicRoot}${path}`), `missing commander asset: ${path}`);
}

console.log('Canonical commander names, art, and model routes are valid.');