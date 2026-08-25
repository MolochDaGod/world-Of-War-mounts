/**
 * CombatSystem — 30 Hz regiment-scale combat with abilities, passives, and status effects.
 *
 * Combat is intentionally slower than the original (×0.55 damage, ×1.3 cooldowns)
 * to allow more meaningful decisions and ability usage.
 *
 * Per-tick pipeline:
 *   1. Tick combatElapsed (synced to store every 1 s)
 *   2. Regen ability charges
 *   3. Per-unit: expire status effects, apply bleed, shield bash, normal combat
 *   4. Multi-shot pass (Fabled archers)
 *   5. Totem heal pass
 *   6. Life-drain ally heal pass
 *   7. batchCombatTick → single Zustand write
 *   8. Victory detection
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore, UnitData } from '../store/gameStore';
import { emitProjectile, ProjectileKind } from '../effects/ProjectileSystem';
import { emitCombatImpact } from '../effects/CombatEffects';
import { ABILITY_DEFS, AbilityId } from '../data/AbilityDefs';
import { canAutoCastRegimentSkill, resolveAreaSkill } from './combatSkillResolver';
import { COMMANDER_BY_ID } from '../data/CommanderDefs';
import { useWarZoneStore } from '../store/warZoneStore';
import {
  findBlockingWarZoneObstacle,
  hasWarZoneLineOfSight,
  resolveWarZoneMovement,
  activeWarZoneObstacles,
} from '../world/warZoneGeometry';
import { getCombatStats } from '../data/CombatStats';
import {
  chargeMovementAllowed,
  chargeExitPosition,
  combatDefenseMultiplier,
  sweptChargeTargets,
} from './regimentCombatMotion';

const TICK = 0.05; // seconds per combat frame (≈ 20 Hz) — cinematic pace
const BATTLE_LIMIT = 480; // 8-minute timer

const RANGED_TYPES = new Set<UnitData['type']>(['archers', 'mage', 'boltThrower', 'catapult', 'grieeGlee']);
const SIEGE_TYPES  = new Set<UnitData['type']>(['boltThrower', 'catapult', 'grieeGlee']);
const CAVALRY_TYPES = new Set<UnitData['type']>(['cavalry', 'heavyCavalry']);

function projectileKind(type: UnitData['type']): ProjectileKind {
  if (type === 'mage')                    return 'magic';
  if (type === 'boltThrower')             return 'bolt';
  if (type === 'catapult' || type === 'grieeGlee') return 'stone';
  return 'arrow';
}

// Module-level timers
const attackTimers: Record<string, number> = {};
const chargeRegenTimers: Record<string, number> = {};
const meleeWindups = new Map<string, { strikeAt: number }>();
const cavalryCharges = new Map<string, {
  targetId: string;
  exitPosition: [number, number, number];
  hitIds: Set<string>;
}>();
const cavalryChargeCooldowns = new Map<string, number>();
const MELEE_WINDUP = 0.22;
const CAVALRY_REFORM_DELAY = 2.4;

// Combat elapsed tracked locally, synced to store every ~1 s
let localElapsed  = 0;
let lastStoreSync = 0;

export function CombatSystem() {
  const lastUpdate = useRef(0);
  const battleActive = useRef(false);

  useFrame((state) => {
    const now = state.clock.elapsedTime;
    if (now - lastUpdate.current < TICK) return;
    lastUpdate.current = now;

    const store = useGameStore.getState();
    const { phase, units, totems, mapType, batchCombatTick, batchRemoveUnits,
             tickCombatElapsed, expireTotems, regenAbilityCharges, setPhase } = store;

    if (phase !== 'battle') {
      battleActive.current = false;
      return;
    }

    // Timers are module scoped for frame-speed performance, so they must be
    // cleared before every fresh battle rather than carrying cooldowns forward.
    if (!battleActive.current) {
      battleActive.current = true;
      localElapsed = 0;
      lastStoreSync = 0;
      for (const key of Object.keys(attackTimers)) delete attackTimers[key];
      for (const key of Object.keys(chargeRegenTimers)) delete chargeRegenTimers[key];
      meleeWindups.clear();
      cavalryCharges.clear();
      cavalryChargeCooldowns.clear();
    }

    // ── Commander leadership aura — pre-compute per team ─────────────────
    type AuraData = { x: number; z: number; radius: number; mult: number; type: string };
    const cmdAura = new Map<1|2, AuraData>();
    for (const u of units) {
      if ((u as any).isCommander && u.state !== 'dead') {
        const def = COMMANDER_BY_ID[(u as any).commanderArchetype ?? ''];
        if (def) {
          cmdAura.set(u.teamId, {
            x: u.position[0], z: u.position[2],
            radius: def.leadershipBonus.auraRadius,
            mult: def.leadershipBonus.multiplier,
            type: def.leadershipBonus.type,
          });
        }
      }
    }
    /** Returns the commander aura multiplier for a unit and a given stat type. */
    function commanderMult(u: UnitData, stat: 'attack' | 'speed' | 'defense'): number {
      const aura = cmdAura.get(u.teamId);
      if (!aura || aura.type !== stat) return 1;
      const dx = u.position[0] - aura.x;
      const dz = u.position[2] - aura.z;
      return dx*dx + dz*dz <= aura.radius * aura.radius ? aura.mult : 1;
    }

    // ── 1. Tick combat elapsed ──────────────────────────────────────────────
    localElapsed += TICK;
    if (localElapsed - lastStoreSync >= 1) {
      tickCombatElapsed(localElapsed - lastStoreSync);
      lastStoreSync = localElapsed;
    }
    const elapsed = localElapsed;

    // Battle timer expiry
    if (elapsed >= BATTLE_LIMIT) {
      setTimeout(() => setPhase('victory'), 500);
      return;
    }

    const living = units.filter(u => u.state !== 'dead');
    const patches   = new Map<string, Partial<UnitData>>();
    const kills: string[] = [];
    const autoHeroCasts: { unitId: string; abilityId: AbilityId }[] = [];
    const chargeRegenUnitIds: string[] = [];
    const obstacleDamage = new Map<string, number>();
    const warZoneObstacles = mapType === 'arena'
      ? useWarZoneStore.getState().obstacles
      : [];
    const activeWarZoneCover = mapType === 'arena'
      ? activeWarZoneObstacles(warZoneObstacles)
      : [];
    let scoreDelta1 = 0;
    let scoreDelta2 = 0;

    // Helpers to read the most-current value for a unit (patch or base)
    const cur = <K extends keyof UnitData>(u: UnitData, key: K): UnitData[K] =>
      (patches.get(u.id)?.[key] ?? u[key]) as UnitData[K];
    const curHp = (u: UnitData) => (patches.get(u.id)?.health ?? u.health) as number;
    const isDead = (u: UnitData) => patches.get(u.id)?.state === 'dead' || u.state === 'dead';

    const applyAreaSkill = (
      caster: UnitData,
      abilityId: AbilityId,
      origin: [number, number, number],
      useAttackEffect = false,
    ) => {
      const def = ABILITY_DEFS[abilityId];
      const areaEffect = useAttackEffect ? def?.attackEffect : def?.areaEffect;
      if (!def || !areaEffect) return;
      const snapshot = units.map(candidate => ({
        ...candidate,
        ...patches.get(candidate.id),
      }));
      const currentCaster = snapshot.find(candidate => candidate.id === caster.id) ?? caster;
      const resolution = resolveAreaSkill({
        units: snapshot,
        caster: currentCaster,
        origin,
        definition: useAttackEffect ? { ...def, areaEffect } : def,
        now: elapsed,
      });
      for (const [id, patch] of resolution.patches) {
        patches.set(id, { ...patches.get(id), ...patch });
      }
      for (const id of resolution.deadIds) {
        if (!kills.includes(id)) kills.push(id);
        delete attackTimers[id];
      }
      scoreDelta1 += resolution.scoreDelta1;
      scoreDelta2 += resolution.scoreDelta2;
      // A rare skill cast may add one visual event; normal combat remains a
      // single batched store write per tick.
      useGameStore.getState().emitSkillBurst({
        position: origin,
        radius: areaEffect.radius,
        color: def.color,
        kind: areaEffect.vfx,
        duration: 1_100,
      });
    };

    function advanceWithCover(unit: UnitData, target: [number, number, number], step: number) {
      if (mapType !== 'arena') {
        const dx = target[0] - unit.position[0];
        const dz = target[2] - unit.position[2];
        const distance = Math.sqrt(dx * dx + dz * dz);
        return [
          unit.position[0] + (dx / distance) * step,
          unit.position[1],
          unit.position[2] + (dz / distance) * step,
        ] as [number, number, number];
      }

      const dx = target[0] - unit.position[0];
      const dz = target[2] - unit.position[2];
      const distance = Math.sqrt(dx * dx + dz * dz);
      if (distance < 0.0001) return unit.position;
      const direct: [number, number, number] = [
        unit.position[0] + (dx / distance) * step,
        unit.position[1],
        unit.position[2] + (dz / distance) * step,
      ];
       const blocker = findBlockingWarZoneObstacle(unit.position, direct, warZoneObstacles, activeWarZoneCover);
      if (blocker) {
        const damageMultiplier = SIEGE_TYPES.has(unit.type)
          ? 0.95
          : RANGED_TYPES.has(unit.type)
            ? 0.12
            : 0.45;
        const damage = getCombatStats(unit.type).damage
          * damageMultiplier * TICK;
        obstacleDamage.set(blocker.id, (obstacleDamage.get(blocker.id) ?? 0) + damage);
      }
       return resolveWarZoneMovement(unit.position, target, step, warZoneObstacles, activeWarZoneCover);
    }

    // ── 2. Per-unit status effects + combat ─────────────────────────────────
    for (const unit of living) {
      if (isDead(unit)) continue;

      const p = patches.get(unit.id) ?? {};
      const cfg = getCombatStats(unit.type);

      // ── Expire phase shift ──────────────────────────────────────────────
      if (unit.phaseShift && unit.phaseShiftUntil !== undefined && elapsed >= unit.phaseShiftUntil) {
        patches.set(unit.id, { ...p, phaseShift: false });
      }

      // ── Expire speed boost ──────────────────────────────────────────────
      if (unit.speedBoostUntil !== undefined && elapsed >= unit.speedBoostUntil) {
        patches.set(unit.id, { ...patches.get(unit.id), speedBoostUntil: undefined });
      }
      if (unit.slowUntil !== undefined && elapsed >= unit.slowUntil) {
        patches.set(unit.id, { ...patches.get(unit.id), slowUntil: undefined, slowMultiplier: undefined });
      }
      const stunnedUntil = cur(unit, 'stunnedUntil') ?? 0;
      if (stunnedUntil > elapsed) {
        if (cur(unit, 'state') !== 'idle') {
          patches.set(unit.id, { ...patches.get(unit.id), state: 'idle' });
        }
        continue;
      }

      // ── Bleed damage ────────────────────────────────────────────────────
      if (unit.bleed && unit.bleed.ticks > 0) {
        // Bleed ticks at ~1 Hz (every 30 frames ≈ 1 s)
        const bleedTimer = chargeRegenTimers[`bleed_${unit.id}`] ?? 0;
        if (elapsed - bleedTimer >= 1.0) {
          chargeRegenTimers[`bleed_${unit.id}`] = elapsed;
          const hp = curHp(unit) - unit.bleed.damage;
          if (hp <= 0) {
            patches.set(unit.id, { ...patches.get(unit.id), health: 0, state: 'dead',
              bleed: undefined });
            kills.push(unit.id);
            delete attackTimers[unit.id];
            if (unit.teamId === 1) scoreDelta2++; else scoreDelta1++;
          } else {
            const newTicks = unit.bleed.ticks - 1;
            patches.set(unit.id, { ...patches.get(unit.id), health: hp,
              bleed: newTicks > 0 ? { damage: unit.bleed.damage, ticks: newTicks } : undefined });
          }
        }
      }

      if (isDead(unit)) continue;

      // ── Shield Bash — one-tick AOE ───────────────────────────────────────
      if (unit.shieldBashing) {
        patches.set(unit.id, { ...patches.get(unit.id), shieldBashing: false });
        applyAreaSkill(unit, 'shield_bash', unit.position);
      }

      // ── Find nearest living enemy (skip phased units) ───────────────────
      if (unit.coverTargetId && SIEGE_TYPES.has(unit.type) && mapType === 'arena') {
        const cover = warZoneObstacles.find(
          (obstacle) => obstacle.id === unit.coverTargetId && !obstacle.destroyed,
        );
        if (!cover) {
          patches.set(unit.id, {
            ...patches.get(unit.id),
            coverTargetId: undefined,
            state: 'idle',
          });
          continue;
        }

        const dx = cover.position[0] - unit.position[0];
        const dz = cover.position[2] - unit.position[2];
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (distance <= cfg.attackRange) {
          if (cur(unit, 'state') !== 'attack') {
            patches.set(unit.id, { ...patches.get(unit.id), state: 'attack' });
          }
          const timer = attackTimers[unit.id] ?? 0;
          if (elapsed - timer >= cfg.attackCooldown) {
            attackTimers[unit.id] = elapsed;
            emitProjectile(unit.position, [
              cover.position[0] + (Math.random() - 0.5) * Math.min(cover.footprint[0], 2),
              0,
              cover.position[2] + (Math.random() - 0.5) * Math.min(cover.footprint[1], 2),
            ], projectileKind(unit.type));
            obstacleDamage.set(
              cover.id,
              (obstacleDamage.get(cover.id) ?? 0) + cfg.damage * commanderMult(unit, 'attack'),
            );
          }
        } else {
          const step = cfg.speed * commanderMult(unit, 'speed') * TICK;
          patches.set(unit.id, {
            ...patches.get(unit.id),
            state: 'move',
            formationFacing: Math.atan2(dx, dz),
            position: advanceWithCover(unit, cover.position, step),
          });
        }
        continue;
      }

      let nearest: UnitData | null = null;
      let minDist = Infinity;
      const focusedTarget = unit.targetUnitId
        ? living.find(other => (
          other.id === unit.targetUnitId
          && other.teamId !== unit.teamId
          && !isDead(other)
          && !(patches.get(other.id)?.phaseShift || other.phaseShift)
        ))
        : undefined;

      if (focusedTarget) {
        nearest = focusedTarget;
        minDist = Math.hypot(
          unit.position[0] - focusedTarget.position[0],
          unit.position[2] - focusedTarget.position[2],
        );
      } else {
        if (unit.targetUnitId) {
          patches.set(unit.id, {
            ...patches.get(unit.id),
            targetUnitId: undefined,
            targetPosition: undefined,
          });
        }
        for (const other of living) {
          if (other.teamId === unit.teamId || isDead(other)) continue;
          if (patches.get(other.id)?.phaseShift || other.phaseShift) continue;
          const dx = unit.position[0] - other.position[0];
          const dz = unit.position[2] - other.position[2];
          const d  = Math.sqrt(dx*dx + dz*dz);
          if (d < minDist) { minDist = d; nearest = other; }
        }
      }

      if (!nearest) {
        if (cur(unit, 'state') !== 'idle') patches.set(unit.id, { ...patches.get(unit.id), state: 'idle' });
        continue;
      }

      const targetVisible = mapType !== 'arena'
        || hasWarZoneLineOfSight(unit.position, nearest.position, warZoneObstacles, activeWarZoneCover);

      // ── LOB MODE: siege fires at forced position ─────────────────────────
      if (unit.lobTarget && SIEGE_TYPES.has(unit.type)) {
        if (cur(unit, 'state') !== 'attack') patches.set(unit.id, { ...patches.get(unit.id), state: 'attack' });
        const timer = attackTimers[unit.id] ?? 0;
        if (elapsed - timer >= cfg.attackCooldown) {
          attackTimers[unit.id] = elapsed;
          const lt = unit.lobTarget;
          emitProjectile(unit.position, [
            lt[0] + (Math.random() - 0.5) * 4, 0, lt[2] + (Math.random() - 0.5) * 4,
          ], projectileKind(unit.type));
        }
        continue;
      }

      const isCavalry = CAVALRY_TYPES.has(unit.type);
      const formationLockedUntil = cur(unit, 'formationLockUntil') ?? 0;
      const chargeMovementLocked = !chargeMovementAllowed(
        cur(unit, 'standGround'),
        formationLockedUntil,
        elapsed,
      );
      const canInitiateCharge = isCavalry
        && targetVisible
        && !chargeMovementLocked
        && (unit.attackMove || !!unit.targetUnitId || !unit.targetPosition);
      let charge = cavalryCharges.get(unit.id);
      if (charge && (charge.targetId !== nearest.id || chargeMovementLocked)) {
        cavalryCharges.delete(unit.id);
        charge = undefined;
      }
      if (
        !charge
        && canInitiateCharge
        && minDist > cfg.attackRange * 1.18
        && elapsed >= (cavalryChargeCooldowns.get(unit.id) ?? 0)
      ) {
        charge = {
          targetId: nearest.id,
          exitPosition: chargeExitPosition(
            unit.position,
            nearest.position,
            Math.max(8, unit.formationCols * unit.spacing * 1.4),
          ),
          hitIds: new Set(),
        };
        cavalryCharges.set(unit.id, charge);
      }

      // A charge advances through the target formation instead of stopping at
      // attack range. Swept targets are resolved once against the deterministic
      // tick segment; Rapier stays out of regiment movement.
      if (charge) {
        const exitDx = charge.exitPosition[0] - unit.position[0];
        const exitDz = charge.exitPosition[2] - unit.position[2];
        const exitDistance = Math.hypot(exitDx, exitDz);
        const speedMult = (unit.speedBoostUntil && elapsed < unit.speedBoostUntil ? 1.8 : 1.0)
          * ((cur(unit, 'slowUntil') ?? 0) > elapsed ? (cur(unit, 'slowMultiplier') ?? 1) : 1)
          * commanderMult(unit, 'speed');
        const step = cfg.speed * speedMult * TICK * 1.45;
        const nextPosition = exitDistance <= step
          ? charge.exitPosition
          : advanceWithCover(unit, charge.exitPosition, step);
        const sweepWidth = Math.max(2.4, unit.formationCols * unit.spacing * 0.32);
        const swept = sweptChargeTargets(
          unit,
          unit.position,
          nextPosition,
          living.filter(candidate => !isDead(candidate)),
          charge.hitIds,
          sweepWidth,
        );
        const chargeAttackSkill = cur(unit, 'pendingAttackSkill');
        let attackSkillResolved = false;

        for (const target of swept) {
          // A prior charge impact can release an AOE that kills a later
          // regiment in this same sweep. Always read the current patch before
          // applying the direct hit so score/removal remain one-per-target.
          if (isDead(target)) {
            charge.hitIds.add(target.id);
            continue;
          }
          charge.hitIds.add(target.id);
          const guarded = target.type === 'shieldwall'
            || patches.get(target.id)?.standGround
            || target.standGround;
          let damageMultiplier = 1;
          if (unit.chargeBoost) damageMultiplier *= 3;
          const damageReduction = combatDefenseMultiplier({
            shieldwall: target.type === 'shieldwall',
            standGround: patches.get(target.id)?.standGround ?? target.standGround,
            shieldWallUntil: patches.get(target.id)?.shieldWallUntil ?? target.shieldWallUntil,
            commanderDefenseMultiplier: commanderMult(target, 'defense'),
            elapsed,
          });
          const rawDamage = cfg.damage * 1.25 * damageMultiplier
            * damageReduction * commanderMult(unit, 'attack');
          let damage = rawDamage;
          const barrierUntil = patches.get(target.id)?.arcaneBarrierUntil ?? target.arcaneBarrierUntil ?? 0;
          const barrierHp = patches.get(target.id)?.arcaneBarrierHp ?? target.arcaneBarrierHp ?? 0;
          if (barrierUntil > elapsed && barrierHp > 0) {
            const absorbed = Math.min(barrierHp, damage);
            damage -= absorbed;
            patches.set(target.id, {
              ...patches.get(target.id),
              arcaneBarrierHp: barrierHp - absorbed,
            });
          }
          const hp = Math.max(0, curHp(target) - damage);
          patches.set(target.id, {
            ...patches.get(target.id),
            health: hp,
            stunnedUntil: hp > 0 ? Math.max(cur(target, 'stunnedUntil') ?? 0, elapsed + 0.45) : undefined,
            ...(hp <= 0 ? { state: 'dead' as const } : {}),
          });
          emitCombatImpact(unit.position, target.position, guarded ? 'guard' : 'charge');
          if (hp <= 0) {
            kills.push(target.id);
            delete attackTimers[target.id];
            if (unit.teamId === 1) scoreDelta1++; else scoreDelta2++;
          }
          if (chargeAttackSkill && !attackSkillResolved) {
            applyAreaSkill(unit, chargeAttackSkill, target.position, true);
            patches.set(unit.id, { ...patches.get(unit.id), pendingAttackSkill: undefined });
            attackSkillResolved = true;
          }
        }

        if (unit.chargeBoost && swept.length > 0) {
          patches.set(unit.id, { ...patches.get(unit.id), chargeBoost: false });
        }

        const facing = Math.atan2(exitDx, exitDz);
        if (exitDistance <= step) {
          cavalryCharges.delete(unit.id);
          cavalryChargeCooldowns.set(unit.id, elapsed + CAVALRY_REFORM_DELAY);
          patches.set(unit.id, {
            ...patches.get(unit.id),
            position: nextPosition,
            formationFacing: facing,
            state: 'idle',
          });
        } else {
          patches.set(unit.id, {
            ...patches.get(unit.id),
            position: nextPosition,
            formationFacing: facing,
            state: 'move',
          });
        }
        continue;
      }

      const inRange = minDist <= cfg.attackRange && targetVisible;
      const meleeWindup = meleeWindups.get(unit.id);
      if (!inRange && meleeWindup) meleeWindups.delete(unit.id);
      if (inRange && !RANGED_TYPES.has(unit.type)) {
        const lastHit = attackTimers[unit.id] ?? 0;
        if (!meleeWindup && elapsed - lastHit >= cfg.attackCooldown) {
          meleeWindups.set(unit.id, { strikeAt: elapsed + MELEE_WINDUP });
          patches.set(unit.id, { ...patches.get(unit.id), state: 'attack' });
          continue;
        }
        if (meleeWindup && elapsed < meleeWindup.strikeAt) {
          patches.set(unit.id, { ...patches.get(unit.id), state: 'attack' });
          continue;
        }
        if (meleeWindup) meleeWindups.delete(unit.id);
      }

      if (inRange) {
        // ── ATTACK ────────────────────────────────────────────────────────
        if (cur(unit, 'state') !== 'attack') patches.set(unit.id, { ...patches.get(unit.id), state: 'attack' });

        const timer = attackTimers[unit.id] ?? 0;
        if (elapsed - timer >= cfg.attackCooldown) {
          attackTimers[unit.id] = elapsed;

          // Damage multiplier from passives and status effects
          let dmgMult = 1.0;
          if (unit.chargeBoost) dmgMult *= 3.0;
          // Elven archers: passive −0.3 s cooldown (already baked into config, bonus here)
          if (unit.race === 'Elves' && unit.type === 'archers') dmgMult *= 1.1;

          // ── Multi-shot: attack top-3 enemies ─────────────────────────
          if (unit.multiShotReady) {
            patches.set(unit.id, { ...patches.get(unit.id), multiShotReady: false });
            const enemies = living
              .filter((e) =>
                e.teamId !== unit.teamId
                && !isDead(e)
                && !(patches.get(e.id)?.phaseShift || e.phaseShift)
                && (mapType !== 'arena'
                  || hasWarZoneLineOfSight(unit.position, e.position, warZoneObstacles, activeWarZoneCover)),
              )
              .map(e => {
                const dx = e.position[0] - unit.position[0];
                const dz = e.position[2] - unit.position[2];
                return { e, d: Math.sqrt(dx*dx + dz*dz) };
              })
              .sort((a, b) => a.d - b.d)
              .slice(0, 3)
              .map(x => x.e);

            for (const target of enemies) {
              emitProjectile(unit.position, target.position, projectileKind(unit.type));
              const hp = Math.max(0, curHp(target) - cfg.damage * dmgMult);
              if (hp <= 0) {
                patches.set(target.id, { ...patches.get(target.id), health: 0, state: 'dead' });
                kills.push(target.id);
                delete attackTimers[target.id];
                if (unit.teamId === 1) scoreDelta1++; else scoreDelta2++;
              } else {
                patches.set(target.id, { ...patches.get(target.id), health: hp });
              }
            }
            // Consume charge boost
            patches.set(unit.id, { ...patches.get(unit.id), chargeBoost: false });
            continue;
          }

          // ── Ranged projectile ─────────────────────────────────────────
          if (RANGED_TYPES.has(unit.type)) {
            emitProjectile(unit.position, [
              nearest.position[0] + (Math.random() - 0.5) * 2,
              nearest.position[1],
              nearest.position[2] + (Math.random() - 0.5) * 2,
            ], projectileKind(unit.type));
          }

          // ── Damage reduction on target ───────────────────────────────
          // Shieldwall passive: 80 % damage taken; stand ground: 75 % damage taken
          const targetType = nearest.type;
          const guarded = targetType === 'shieldwall'
            || patches.get(nearest.id)?.standGround
            || nearest.standGround;
          const drMult = combatDefenseMultiplier({
            shieldwall: targetType === 'shieldwall',
            standGround: patches.get(nearest.id)?.standGround ?? nearest.standGround,
            shieldWallUntil: patches.get(nearest.id)?.shieldWallUntil ?? nearest.shieldWallUntil,
            commanderDefenseMultiplier: commanderMult(nearest, 'defense'),
            elapsed,
          });

          const rawDmg = cfg.damage * dmgMult * drMult * commanderMult(unit, 'attack');
          let effectiveDmg = rawDmg;
          const barrierUntil = patches.get(nearest.id)?.arcaneBarrierUntil ?? nearest.arcaneBarrierUntil ?? 0;
          const barrierHp = patches.get(nearest.id)?.arcaneBarrierHp ?? nearest.arcaneBarrierHp ?? 0;
          if (barrierUntil > elapsed && barrierHp > 0) {
            const absorbed = Math.min(barrierHp, effectiveDmg);
            effectiveDmg -= absorbed;
            patches.set(nearest.id, {
              ...patches.get(nearest.id),
              arcaneBarrierHp: barrierHp - absorbed,
            });
          }
          const hp     = Math.max(0, curHp(nearest) - effectiveDmg);
          if (!RANGED_TYPES.has(unit.type)) {
            emitCombatImpact(unit.position, nearest.position, guarded ? 'guard' : 'melee');
          }

          // ── Charge boost: consume flag ───────────────────────────────
          if (unit.chargeBoost) {
            patches.set(unit.id, { ...patches.get(unit.id), chargeBoost: false });
          }

          // ── Death Strike bleed ───────────────────────────────────────
          if (unit.pendingBleed && hp > 0) {
            patches.set(nearest.id, { ...patches.get(nearest.id), bleed: { damage: 50, ticks: 6 } });
            patches.set(unit.id, { ...patches.get(unit.id), pendingBleed: false });
          } else if (unit.pendingBleed) {
            patches.set(unit.id, { ...patches.get(unit.id), pendingBleed: false });
          }

          // ── Apply damage ─────────────────────────────────────────────
          if (hp <= 0) {
            patches.set(nearest.id, { ...patches.get(nearest.id), health: 0, state: 'dead' });
            kills.push(nearest.id);
            delete attackTimers[nearest.id];
            if (unit.teamId === 1) scoreDelta1++; else scoreDelta2++;
          } else {
            patches.set(nearest.id, { ...patches.get(nearest.id), health: hp });

            // ── Life Drain: heal nearby allies ───────────────────────
            if (unit.lifedrainAura && unit.type === 'mage') {
              const healAmt = effectiveDmg * 0.45;
              const drainRange = 12;
              for (const ally of living) {
                if (ally.teamId !== unit.teamId || isDead(ally)) continue;
                const dx = ally.position[0] - unit.position[0];
                const dz = ally.position[2] - unit.position[2];
                if (Math.sqrt(dx*dx + dz*dz) > drainRange) continue;
                const allyHp = Math.min(ally.maxHealth, curHp(ally) + healAmt);
                patches.set(ally.id, { ...patches.get(ally.id), health: allyHp });
              }
            }
          }

          const pendingAttackSkill = cur(unit, 'pendingAttackSkill');
          if (pendingAttackSkill) {
            applyAreaSkill(unit, pendingAttackSkill, nearest.position, true);
            patches.set(unit.id, {
              ...patches.get(unit.id),
              pendingAttackSkill: undefined,
            });
          }
        }

      } else {
        // ── MOVEMENT ─────────────────────────────────────────────────────
        // Stand ground: never move
        const formationLockedUntil = patches.get(unit.id)?.formationLockUntil ?? unit.formationLockUntil ?? 0;
        if (formationLockedUntil > elapsed || patches.get(unit.id)?.standGround || unit.standGround) {
          if (cur(unit, 'state') !== 'idle') patches.set(unit.id, { ...patches.get(unit.id), state: 'idle' });
          continue;
        }

        const speedMult = (unit.speedBoostUntil && elapsed < unit.speedBoostUntil ? 1.8 : 1.0)
          * ((cur(unit, 'slowUntil') ?? 0) > elapsed ? (cur(unit, 'slowMultiplier') ?? 1) : 1)
          * commanderMult(unit, 'speed');

        // Focus orders follow the target's live position. The stored
        // targetPosition is only a fallback for move, patrol, and attack-move.
        const pTarget = focusedTarget?.position ?? unit.targetPosition;
        if (pTarget) {
          const pdx = pTarget[0] - unit.position[0];
          const pdz = pTarget[2] - unit.position[2];
          const pdist = Math.sqrt(pdx*pdx + pdz*pdz);

          if (pdist < 3) {
            if (unit.patrolA && unit.patrolB) {
              const nextWp = unit.patrolToB ? unit.patrolB : unit.patrolA;
              patches.set(unit.id, { ...patches.get(unit.id),
                targetPosition: nextWp, patrolToB: !unit.patrolToB, state: 'idle' });
            } else {
              patches.set(unit.id, { ...patches.get(unit.id), targetPosition: undefined, state: 'idle' });
            }
          } else {
            const step = cfg.speed * speedMult * TICK;
            const facing = Math.atan2(pdx, pdz);
            patches.set(unit.id, {
              ...patches.get(unit.id),
              state: 'move',
              formationFacing: facing,
              position: advanceWithCover(unit, pTarget, step),
            });
          }
        } else {
          // ── AI BEHAVIOUR — unit-type tactics ──────────────────────────
          const dx = nearest.position[0] - unit.position[0];
          const dz = nearest.position[2] - unit.position[2];
          const dist = Math.sqrt(dx*dx + dz*dz);

          let moveX = dx / dist;
          let moveZ = dz / dist;

          if (RANGED_TYPES.has(unit.type) && !SIEGE_TYPES.has(unit.type)) {
            // ── RANGED KITE: maintain a comfortable stand-off distance ──
            // Ideal range = 70 % of max attack range — close enough to shoot
            // but far enough to avoid melee.
            const idealRange = cfg.attackRange * 0.70;
            if (dist < idealRange) {
              // Too close — back away from the enemy
              moveX = -dx / dist;
              moveZ = -dz / dist;
            }
            // If already beyond attackRange we march forward (default behaviour)
          } else if (unit.type === 'cavalry' || unit.type === 'heavyCavalry') {
            // ── CAVALRY FLANK: offset attack angle by ≈ 60° ───────────
            // Cavalry charges from the side — harder to stop with a wall.
            const flankAngle = (unit.teamId === 1 ? 1 : -1) * Math.PI * 0.35;
            const cos = Math.cos(flankAngle);
            const sin = Math.sin(flankAngle);
            moveX = cos * (dx / dist) - sin * (dz / dist);
            moveZ = sin * (dx / dist) + cos * (dz / dist);
          }
          // Infantry / shieldwall / skirmishers: straight charge (default)

          const step = cfg.speed * speedMult * TICK;
          const facing = Math.atan2(moveX, moveZ);
          patches.set(unit.id, {
            ...patches.get(unit.id),
            state: 'move',
            formationFacing: facing,
            position: advanceWithCover(unit, [
              unit.position[0] + moveX * step * 4,
              unit.position[1],
              unit.position[2] + moveZ * step * 4,
            ], step),
          });
        }
      }

      // ── MAGE AUTO-CAST ─────────────────────────────────────────────────────
      // Regiment skills are player-directed by default. Only definitions that
      // explicitly opt into autonomous AI can spend a charge here; in particular,
      // ground skills such as Arcane Burst must retain their charge until aimed.
      if (unit.type === 'mage' && unit.abilityCharges && nearest && minDist <= cfg.attackRange * 1.4) {
        for (const [abilityId, cs] of Object.entries(unit.abilityCharges)) {
          if (!cs || cs.charges < 1) continue;
          const def = ABILITY_DEFS[abilityId as AbilityId];
          if (!def || !canAutoCastRegimentSkill(def)) continue;
          // Auto-cast on a cadence: every 2× normal cooldown so it doesn't spam
          const autoCastKey = `autocast_${unit.id}_${abilityId}`;
          const lastCast = chargeRegenTimers[autoCastKey] ?? 0;
          if (elapsed - lastCast < def.cooldownPerCharge * 1.8) continue;
          chargeRegenTimers[autoCastKey] = elapsed;
          // Consume 1 charge and apply the effect
          const newCs = { charges: cs.charges - 1, nextChargeAt: elapsed + def.cooldownPerCharge };
          patches.set(unit.id, {
            ...patches.get(unit.id),
            abilityCharges: { ...unit.abilityCharges, [abilityId]: newCs },
            // Trigger combat-relevant flags
            ...(abilityId === 'holy_totem'     ? {} : {}),
            ...(abilityId === 'natures_bounty' ? {} : {}),
            ...(abilityId === 'life_drain'     ? { lifedrainAura: !unit.lifedrainAura } : {}),
          });
          break; // only one ability per tick
        }
      }

      // Enemy commanders use their hero kit automatically. Player commanders
      // remain under direct control through the Hero Ability Bar.
      if (unit.isCommander && unit.teamId === 2 && unit.abilityCharges && nearest && !isDead(unit)) {
        const commander = COMMANDER_BY_ID[unit.commanderArchetype ?? ''];
        if (commander) {
          for (const abilityId of commander.heroAbilities) {
            const cs = unit.abilityCharges[abilityId];
            const ability = ABILITY_DEFS[abilityId];
            if (!cs || cs.charges < 1 || !ability) continue;
            const autoCastKey = `hero_autocast_${unit.id}_${abilityId}`;
            const lastCast = chargeRegenTimers[autoCastKey] ?? 0;
            if (elapsed - lastCast < Math.max(2, ability.cooldownPerCharge * 0.8)) continue;
            const canCast =
              (abilityId === 'cavalry_charge' || abilityId === 'shield_bash' || abilityId === 'holy_flame')
                ? minDist <= (abilityId === 'holy_flame' ? 12 : cfg.attackRange + 4)
                : minDist <= 24;
            if (!canCast) continue;
            chargeRegenTimers[autoCastKey] = elapsed;
            autoHeroCasts.push({ unitId: unit.id, abilityId });
            break;
          }
        }
      }
    }

    // ── 3. Ability charge regen (1 Hz) ─────────────────────────────────────
    const REGEN_CHECK_INTERVAL = 1.0;
    for (const unit of living) {
      if (!unit.abilityCharges) continue;
      const lastRegen = chargeRegenTimers[`regen_${unit.id}`] ?? 0;
      if (elapsed - lastRegen < REGEN_CHECK_INTERVAL) continue;
      chargeRegenTimers[`regen_${unit.id}`] = elapsed;
      chargeRegenUnitIds.push(unit.id);
    }

    // ── 4. Totem heal pass ─────────────────────────────────────────────────
    for (const totem of totems) {
      if (totem.expiresAt <= elapsed) continue;
      for (const unit of living) {
        if (unit.teamId !== totem.teamId || isDead(unit)) continue;
        const dx = unit.position[0] - totem.position[0];
        const dz = unit.position[2] - totem.position[2];
        if (Math.sqrt(dx*dx + dz*dz) > totem.radius) continue;
        const healedHp = Math.min(unit.maxHealth, curHp(unit) + totem.healPerSec * TICK);
        patches.set(unit.id, { ...patches.get(unit.id), health: healedHp });
      }
    }
    // Expire totems every few seconds
    if (Math.floor(elapsed) % 3 === 0 && elapsed - lastStoreSync < TICK * 2) {
      expireTotems(elapsed);
    }

    // ── 5. Apply patches ───────────────────────────────────────────────────
    if (patches.size > 0 || scoreDelta1 > 0 || scoreDelta2 > 0) {
      batchCombatTick(patches, scoreDelta1, scoreDelta2);
    }

    for (const unitId of chargeRegenUnitIds) {
      regenAbilityCharges(unitId);
    }

    if (obstacleDamage.size > 0) {
      useWarZoneStore.getState().damageObstacles(
        [...obstacleDamage].map(([id, amount]) => ({ id, amount })),
      );
    }

    for (const cast of autoHeroCasts) {
      useGameStore.getState().triggerAbility([cast.unitId], cast.abilityId);
    }

    if (kills.length > 0) {
      const ids = [...kills];
      setTimeout(() => batchRemoveUnits(ids), 1400);
    }

    // ── 6. Victory detection ───────────────────────────────────────────────
    if (phase === 'battle') {
      const aliveT1 = living.filter(u => u.teamId === 1 && !isDead(u) && !kills.includes(u.id)).length;
      const aliveT2 = living.filter(u => u.teamId === 2 && !isDead(u) && !kills.includes(u.id)).length;
      if (living.length > 0 && (aliveT1 === 0 || aliveT2 === 0)) {
        setTimeout(() => setPhase('victory'), 1600);
      }
    }
  });

  return null;
}
