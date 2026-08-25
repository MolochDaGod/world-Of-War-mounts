import type { AbilityDef, AreaEffectSpec } from '../data/AbilityDefs';
import type { UnitData } from '../store/gameStore';

export interface AreaSkillResolution {
  patches: Map<string, Partial<UnitData>>;
  hitIds: string[];
  deadIds: string[];
  scoreDelta1: number;
  scoreDelta2: number;
}

export interface SkillChargeState {
  charges: number;
  nextChargeAt: number;
}

export function consumeSkillCharge(
  current: SkillChargeState | undefined,
  definition: Pick<AbilityDef, 'maxCharges' | 'cooldownPerCharge'>,
  now: number,
): SkillChargeState {
  return {
    charges: Math.max(0, (current?.charges ?? definition.maxCharges) - 1),
    nextChargeAt: now + definition.cooldownPerCharge,
  };
}

export function isTimedSkillBurstExpired(
  burst: Pick<{ createdAt: number; duration: number }, 'createdAt' | 'duration'>,
  now: number,
) {
  return now - burst.createdAt >= burst.duration;
}

/**
 * Regiment skills are player-directed unless a definition deliberately opts
 * into autonomous AI behavior. Ground-targeted skills are never autonomous:
 * they need a real target position and must not spend a charge without one.
 */
export function canAutoCastRegimentSkill(
  definition: Pick<AbilityDef, 'autonomous' | 'targeting'>,
) {
  return definition.autonomous === true && definition.targeting !== 'ground';
}

interface ResolveAreaSkillInput {
  units: UnitData[];
  caster: UnitData;
  origin: [number, number, number];
  definition: AbilityDef;
  now: number;
}

function mergePatch(
  patches: Map<string, Partial<UnitData>>,
  id: string,
  patch: Partial<UnitData>,
) {
  patches.set(id, { ...patches.get(id), ...patch });
}

function effectValue(
  value: number,
  distance: number,
  radius: number,
  falloff?: boolean,
) {
  if (!falloff) return value;
  const fraction = Math.max(0, Math.min(1, distance / Math.max(radius, 0.001)));
  return value * (1 - fraction * 0.65);
}

/**
 * Deterministically resolves one AOE cast against a snapshot of units.
 *
 * The combat loop calls this once per cast, so a cast has one stable target set
 * even while the renderer animates its telegraph. The returned patches are
 * merged by the caller into that tick's single combat write.
 */
export function resolveAreaSkill({
  units,
  caster,
  origin,
  definition,
  now,
}: ResolveAreaSkillInput): AreaSkillResolution {
  const effect: AreaEffectSpec | undefined = definition.areaEffect;
  const result: AreaSkillResolution = {
    patches: new Map(),
    hitIds: [],
    deadIds: [],
    scoreDelta1: 0,
    scoreDelta2: 0,
  };
  if (!effect) return result;

  for (const unit of units) {
    const current = { ...unit, ...result.patches.get(unit.id) };
    if (current.state === 'dead') continue;
    if (current.phaseShift) continue;
    if (effect.targetTeam === 'enemy' && current.teamId === caster.teamId) continue;
    if (effect.targetTeam === 'ally' && current.teamId !== caster.teamId) continue;

    const distance = Math.hypot(
      current.position[0] - origin[0],
      current.position[2] - origin[2],
    );
    if (distance > effect.radius) continue;
    result.hitIds.push(current.id);

    const patch = result.patches.get(current.id) ?? {};
    let health = current.health;

    if (effect.damage && current.teamId !== caster.teamId) {
      let damage = effectValue(effect.damage, distance, effect.radius, effect.falloff);
      if (current.type === 'shieldwall') damage *= 0.8;
      if (current.standGround) damage *= 0.75;
      if ((current.shieldWallUntil ?? 0) > now) damage *= 0.55;

      const barrierActive =
        (current.arcaneBarrierUntil ?? 0) > now && (current.arcaneBarrierHp ?? 0) > 0;
      const absorbed = barrierActive
        ? Math.min(current.arcaneBarrierHp ?? 0, damage)
        : 0;
      damage -= absorbed;
      health = Math.max(0, health - damage);
      if (barrierActive) {
        patch.arcaneBarrierHp = Math.max(0, (current.arcaneBarrierHp ?? 0) - absorbed);
      }
    }

    if (effect.heal && current.teamId === caster.teamId) {
      health = Math.min(
        current.maxHealth,
        health + effectValue(effect.heal, distance, effect.radius, effect.falloff),
      );
    }

    if (effect.slowPercent && current.teamId !== caster.teamId) {
      patch.slowUntil = now + (effect.statusDuration ?? 0);
      patch.slowMultiplier = Math.max(0.1, 1 - effect.slowPercent);
    }
    if (effect.stunDuration && current.teamId !== caster.teamId) {
      patch.stunnedUntil = now + effect.stunDuration;
    }

    if (health <= 0 && effect.damage && current.teamId !== caster.teamId) {
      patch.health = 0;
      patch.state = 'dead';
      result.deadIds.push(current.id);
      if (current.teamId === 1) result.scoreDelta2++;
      else result.scoreDelta1++;
    } else if (health !== current.health) {
      patch.health = health;
    }

    mergePatch(result.patches, current.id, patch);
  }

  return result;
}