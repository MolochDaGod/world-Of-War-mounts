import assert from 'node:assert/strict';
import {
  consumeSkillCharge,
  canAutoCastRegimentSkill,
  isTimedSkillBurstExpired,
  resolveAreaSkill,
} from '../src/game/physics/combatSkillResolver.ts';
import { ABILITY_DEFS, getUnitAbilities } from '../src/game/data/AbilityDefs.ts';
import { useGameStore, type UnitData } from '../src/game/store/gameStore.ts';

const caster = {
  id: 'caster', uuid: 'caster', race: 'Elves', type: 'mage',
  position: [0, 0, 0], health: 800, maxHealth: 800, state: 'idle', teamId: 1,
  maxSoldiers: 1, formationRows: 1, formationCols: 1, formationFacing: 0, spacing: 1,
} as const;
const nearEnemy = {
  ...caster, id: 'near', uuid: 'near', teamId: 2, position: [2, 0, 0], health: 500, maxHealth: 500,
};
const farEnemy = {
  ...caster, id: 'far', uuid: 'far', teamId: 2, position: [8, 0, 0], health: 500, maxHealth: 500,
};
const ally = { ...caster, id: 'ally', uuid: 'ally', health: 300, maxHealth: 800 };

const burst = resolveAreaSkill({
  units: [caster, nearEnemy, farEnemy, ally] as any,
  caster: caster as any,
  origin: [0, 0, 0],
  definition: {
    maxCharges: 2,
    cooldownPerCharge: 24,
    areaEffect: {
      radius: 10, targetTeam: 'enemy', damage: 200, slowPercent: 0.25,
      statusDuration: 4, falloff: true, vfx: 'arcane',
    },
  } as any,
  now: 30,
});

assert.equal(burst.hitIds.length, 2, 'AOE only resolves valid enemy targets once');
assert.ok((burst.patches.get('near')?.health ?? 500) < (burst.patches.get('far')?.health ?? 500), 'falloff lowers far-target damage');
assert.equal(burst.patches.get('near')?.slowUntil, 34, 'AOE applies timed slow');
assert.equal(burst.patches.get('ally'), undefined, 'enemy AOE never affects allies');

const charge = consumeSkillCharge({ charges: 1, nextChargeAt: 0 }, { maxCharges: 2, cooldownPerCharge: 24 } as any, 30);
assert.deepEqual(charge, { charges: 0, nextChargeAt: 54 }, 'skill charge consumes once and starts cooldown');
assert.equal(isTimedSkillBurstExpired({ createdAt: 100, duration: 900 }, 999), false, 'VFX stays alive before duration');
assert.equal(isTimedSkillBurstExpired({ createdAt: 100, duration: 900 }, 1000), true, 'VFX expires exactly at duration');
assert.equal(
  canAutoCastRegimentSkill({ autonomous: false, targeting: 'ground' } as any),
  false,
  'ground-targeted Arcane Burst remains charged until a player supplies a target',
);

const game = useGameStore;

// Store-level regression: every ability assigned to a spawned regiment starts
// with a full charge bank and no cooldown already running.
game.getState().resetGame();
game.getState().setSelectedRace('WesternKingdoms');
for (const unitType of ['mage', 'shieldwall', 'cavalry', 'heavyCavalry', 'catapult'] as const) {
  game.getState().addToPlayerArmy({ unitType });
}
game.getState().spawnArmies();

const playerRegiments = game.getState().units.filter(unit => unit.teamId === 1 && !unit.isCommander);
let assignedSkillCount = 0;
for (const regiment of playerRegiments) {
  for (const abilityId of getUnitAbilities(regiment.race, regiment.type)) {
    assignedSkillCount++;
    assert.deepEqual(
      regiment.abilityCharges?.[abilityId],
      { charges: ABILITY_DEFS[abilityId].maxCharges, nextChargeAt: 0 },
      `${regiment.type} starts ${abilityId} fully charged`,
    );
  }
}
assert.ok(assignedSkillCount > 0, 'spawned test army includes assigned combat skills');

function makeTestUnit(
  id: string,
  teamId: 1 | 2,
  position: [number, number, number],
  abilityCharges: UnitData['abilityCharges'] = {},
): UnitData {
  return {
    id,
    uuid: id,
    race: 'Barbarians',
    type: 'mage',
    position,
    health: 800,
    maxHealth: 800,
    state: 'idle',
    teamId,
    maxSoldiers: 1,
    formationRows: 1,
    formationCols: 1,
    formationFacing: 0,
    spacing: 1,
    abilityCharges,
  };
}

// A selected group may contain a depleted caster, but only ready casters may
// resolve the AOE or spend a charge.
game.getState().resetGame();
const readyCaster = makeTestUnit('ready-caster', 1, [0, 0, 0], {
  arcane_burst: { charges: 1, nextChargeAt: 0 },
});
const depletedCaster = makeTestUnit('depleted-caster', 1, [0, 0, 0], {
  arcane_burst: { charges: 0, nextChargeAt: 24 },
});
const mixedSelectionEnemy = makeTestUnit('mixed-selection-enemy', 2, [0, 0, 0]);
mixedSelectionEnemy.health = 1_000;
mixedSelectionEnemy.maxHealth = 1_000;
game.getState().addUnit(readyCaster);
game.getState().addUnit(depletedCaster);
game.getState().addUnit(mixedSelectionEnemy);
game.getState().selectUnits([readyCaster.id, depletedCaster.id]);
game.getState().triggerAbility(
  [readyCaster.id, depletedCaster.id],
  'arcane_burst',
  [0, 0, 0],
);

const afterMixedCast = game.getState();
const updatedReadyCaster = afterMixedCast.units.find(unit => unit.id === readyCaster.id)!;
const updatedDepletedCaster = afterMixedCast.units.find(unit => unit.id === depletedCaster.id)!;
const updatedMixedSelectionEnemy = afterMixedCast.units.find(unit => unit.id === mixedSelectionEnemy.id)!;
assert.equal(updatedMixedSelectionEnemy.health, 740, 'only the ready caster resolves the selected-group AOE');
assert.deepEqual(
  updatedReadyCaster.abilityCharges?.arcane_burst,
  { charges: 0, nextChargeAt: 24 },
  'ready caster spends exactly one AOE charge',
);
assert.deepEqual(
  updatedDepletedCaster.abilityCharges?.arcane_burst,
  { charges: 0, nextChargeAt: 24 },
  'depleted caster cannot spend another AOE charge',
);
assert.equal(afterMixedCast.skillBursts.length, 1, 'depleted caster does not create a free AOE burst');

// Formation Lock is a non-AOE branch that must use the same eligible-caster
// set: depleted commanders cannot spend or restart a cooldown in a group cast.
game.getState().resetGame();
const readyCommander = makeTestUnit('ready-commander', 1, [0, 0, 0], {
  formation_lock: { charges: 1, nextChargeAt: 0 },
});
const depletedCommander = makeTestUnit('depleted-commander', 1, [1, 0, 0], {
  formation_lock: { charges: 0, nextChargeAt: 34 },
});
game.getState().addUnit(readyCommander);
game.getState().addUnit(depletedCommander);
game.getState().triggerAbility(
  [readyCommander.id, depletedCommander.id],
  'formation_lock',
);

let afterFormationLock = game.getState();
assert.deepEqual(
  afterFormationLock.units.find(unit => unit.id === readyCommander.id)?.abilityCharges?.formation_lock,
  { charges: 0, nextChargeAt: 34 },
  'ready commander spends one Formation Lock charge',
);
assert.deepEqual(
  afterFormationLock.units.find(unit => unit.id === depletedCommander.id)?.abilityCharges?.formation_lock,
  { charges: 0, nextChargeAt: 34 },
  'depleted commander keeps its original Formation Lock cooldown',
);

game.getState().triggerAbility([depletedCommander.id], 'formation_lock');
afterFormationLock = game.getState();
assert.deepEqual(
  afterFormationLock.units.find(unit => unit.id === depletedCommander.id)?.abilityCharges?.formation_lock,
  { charges: 0, nextChargeAt: 34 },
  'a solo depleted commander cannot postpone Formation Lock recharge',
);

// Ground-targeted Holy Totem uses the same cast path: it creates one totem,
// consumes one charge, and remains unavailable until its cooldown can restore
// a charge.
game.getState().resetGame();
const totemCaster = makeTestUnit('totem-caster', 1, [0, 0, 0], {
  holy_totem: { charges: 1, nextChargeAt: 0 },
});
game.getState().addUnit(totemCaster);
game.getState().triggerAbility([totemCaster.id], 'holy_totem', [6, 0, 6]);

let afterTotemCast = game.getState();
assert.equal(afterTotemCast.totems.length, 1, 'Holy Totem places one ground effect');
assert.deepEqual(
  afterTotemCast.units[0].abilityCharges?.holy_totem,
  { charges: 0, nextChargeAt: ABILITY_DEFS.holy_totem.cooldownPerCharge },
  'Holy Totem consumes one charge and starts its cooldown',
);

game.getState().tickCombatElapsed(ABILITY_DEFS.holy_totem.cooldownPerCharge - 1);
game.getState().regenAbilityCharges(totemCaster.id);
game.getState().triggerAbility([totemCaster.id], 'holy_totem', [8, 0, 8]);
afterTotemCast = game.getState();
assert.equal(afterTotemCast.totems.length, 1, 'Holy Totem cannot be placed while its charge is unavailable');
assert.equal(
  afterTotemCast.units[0].abilityCharges?.holy_totem?.charges,
  0,
  'Holy Totem remains depleted before its cooldown expires',
);

game.getState().tickCombatElapsed(1);
game.getState().regenAbilityCharges(totemCaster.id);
afterTotemCast = game.getState();
assert.deepEqual(
  afterTotemCast.units[0].abilityCharges?.holy_totem,
  {
    charges: 1,
    nextChargeAt: ABILITY_DEFS.holy_totem.cooldownPerCharge * 2,
  },
  'Holy Totem restores a charge exactly when its cooldown expires',
);

game.getState().triggerAbility([totemCaster.id], 'holy_totem', [10, 0, 10]);
afterTotemCast = game.getState();
assert.equal(afterTotemCast.totems.length, 2, 'Holy Totem can be placed again after its charge restores');
assert.deepEqual(
  afterTotemCast.units[0].abilityCharges?.holy_totem,
  {
    charges: 0,
    nextChargeAt: ABILITY_DEFS.holy_totem.cooldownPerCharge * 2,
  },
  'Holy Totem starts the next cooldown after its recast',
);

console.log('Combat skill resolution test passed.');