import assert from 'node:assert/strict';
import {
  consumeSkillCharge,
  canAutoCastRegimentSkill,
  isTimedSkillBurstExpired,
  resolveAreaSkill,
} from '../src/game/physics/combatSkillResolver.ts';

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

console.log('Combat skill resolution test passed.');