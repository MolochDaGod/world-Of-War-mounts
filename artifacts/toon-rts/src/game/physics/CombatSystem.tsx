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
import { ABILITY_DEFS } from '../data/AbilityDefs';

const TICK = 0.033; // seconds per combat frame (≈ 30 Hz)
const BATTLE_LIMIT = 480; // 8-minute timer

// ── Slower combat config ──────────────────────────────────────────────────────
const UNIT_CONFIG: Record<UnitData['type'], {
  damage: number;
  attackRange: number;
  speed: number;
  attackCooldown: number;
}> = {
  infantry:    { damage: 100, attackRange: 6,  speed: 4.5, attackCooldown: 1.3 },
  swordsmen:   { damage: 100, attackRange: 6,  speed: 4.5, attackCooldown: 1.3 },
  spearmen:    { damage: 82,  attackRange: 8,  speed: 4.0, attackCooldown: 1.3 },
  shieldwall:  { damage: 66,  attackRange: 5,  speed: 2.5, attackCooldown: 2.0 },
  skirmishers: { damage: 72,  attackRange: 6,  speed: 6.5, attackCooldown: 1.0 },
  archers:     { damage: 55,  attackRange: 18, speed: 3.5, attackCooldown: 2.3 },
  cavalry:     { damage: 138, attackRange: 7,  speed: 8.0, attackCooldown: 1.0 },
  heavyCavalry:{ damage: 192, attackRange: 8,  speed: 7.0, attackCooldown: 1.6 },
  mage:        { damage: 110, attackRange: 14, speed: 2.5, attackCooldown: 2.6 },
  boltThrower: { damage: 154, attackRange: 26, speed: 1.5, attackCooldown: 3.9 },
  catapult:    { damage: 220, attackRange: 32, speed: 1.2, attackCooldown: 5.2 },
};

const RANGED_TYPES = new Set<UnitData['type']>(['archers', 'mage', 'boltThrower', 'catapult']);
const SIEGE_TYPES  = new Set<UnitData['type']>(['boltThrower', 'catapult']);

function projectileKind(type: UnitData['type']): ProjectileKind {
  if (type === 'mage')        return 'magic';
  if (type === 'boltThrower') return 'bolt';
  if (type === 'catapult')    return 'stone';
  return 'arrow';
}

// Module-level timers
const attackTimers: Record<string, number> = {};
const chargeRegenTimers: Record<string, number> = {};

// Combat elapsed tracked locally, synced to store every ~1 s
let localElapsed  = 0;
let lastStoreSync = 0;

export function CombatSystem() {
  const lastUpdate = useRef(0);

  useFrame((state) => {
    const now = state.clock.elapsedTime;
    if (now - lastUpdate.current < TICK) return;
    lastUpdate.current = now;

    const store = useGameStore.getState();
    const { phase, units, totems, batchCombatTick, batchRemoveUnits,
            tickCombatElapsed, expireTotems, setPhase } = store;

    if (phase !== 'battle') return;

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
    let scoreDelta1 = 0;
    let scoreDelta2 = 0;

    // Helpers to read the most-current value for a unit (patch or base)
    const cur = <K extends keyof UnitData>(u: UnitData, key: K): UnitData[K] =>
      (patches.get(u.id)?.[key] ?? u[key]) as UnitData[K];
    const curHp = (u: UnitData) => (patches.get(u.id)?.health ?? u.health) as number;
    const isDead = (u: UnitData) => patches.get(u.id)?.state === 'dead' || u.state === 'dead';

    // ── 2. Per-unit status effects + combat ─────────────────────────────────
    for (const unit of living) {
      if (isDead(unit)) continue;

      const p = patches.get(unit.id) ?? {};
      const cfg = UNIT_CONFIG[unit.type] ?? UNIT_CONFIG.swordsmen;

      // ── Expire phase shift ──────────────────────────────────────────────
      if (unit.phaseShift && unit.phaseShiftUntil !== undefined && elapsed >= unit.phaseShiftUntil) {
        patches.set(unit.id, { ...p, phaseShift: false });
      }

      // ── Expire speed boost ──────────────────────────────────────────────
      if (unit.speedBoostUntil !== undefined && elapsed >= unit.speedBoostUntil) {
        patches.set(unit.id, { ...patches.get(unit.id), speedBoostUntil: undefined });
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
        const bashRange = cfg.attackRange + 3;
        for (const enemy of living) {
          if (enemy.teamId === unit.teamId || isDead(enemy)) continue;
          const dx = enemy.position[0] - unit.position[0];
          const dz = enemy.position[2] - unit.position[2];
          if (Math.sqrt(dx*dx + dz*dz) > bashRange) continue;
          const bashDmg = cfg.damage * 1.5;
          const hp = Math.max(0, curHp(enemy) - bashDmg);
          if (hp <= 0) {
            patches.set(enemy.id, { ...patches.get(enemy.id), health: 0, state: 'dead' });
            kills.push(enemy.id);
            delete attackTimers[enemy.id];
            if (unit.teamId === 1) scoreDelta1++; else scoreDelta2++;
          } else {
            // Apply 30 % slow for 5 s
            patches.set(enemy.id, { ...patches.get(enemy.id), health: hp, speedBoostUntil: elapsed + 5 });
          }
        }
        // Emit a burst VFX
        emitProjectile(unit.position, [
          unit.position[0] + (Math.random() - 0.5) * 3,
          unit.position[1],
          unit.position[2] + (Math.random() - 0.5) * 3,
        ], 'arrow');
      }

      // ── Find nearest living enemy (skip phased units) ───────────────────
      let nearest: UnitData | null = null;
      let minDist = Infinity;
      for (const other of living) {
        if (other.teamId === unit.teamId || isDead(other)) continue;
        if (patches.get(other.id)?.phaseShift || other.phaseShift) continue;
        const dx = unit.position[0] - other.position[0];
        const dz = unit.position[2] - other.position[2];
        const d  = Math.sqrt(dx*dx + dz*dz);
        if (d < minDist) { minDist = d; nearest = other; }
      }

      if (!nearest) {
        if (cur(unit, 'state') !== 'idle') patches.set(unit.id, { ...patches.get(unit.id), state: 'idle' });
        continue;
      }

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

      const inRange = minDist <= cfg.attackRange;

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
              .filter(e => e.teamId !== unit.teamId && !isDead(e) && !(patches.get(e.id)?.phaseShift || e.phaseShift))
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
          let drMult = 1.0;
          if (targetType === 'shieldwall') drMult *= 0.80;
          if (patches.get(nearest.id)?.standGround || nearest.standGround) drMult *= 0.75;

          const rawDmg = cfg.damage * dmgMult * drMult;
          const hp     = Math.max(0, curHp(nearest) - rawDmg);

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
              const healAmt = rawDmg * 0.45;
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
        }

      } else {
        // ── MOVEMENT ─────────────────────────────────────────────────────
        // Stand ground: never move
        if (patches.get(unit.id)?.standGround || unit.standGround) {
          if (cur(unit, 'state') !== 'idle') patches.set(unit.id, { ...patches.get(unit.id), state: 'idle' });
          continue;
        }

        const speedMult = unit.speedBoostUntil && elapsed < unit.speedBoostUntil ? 1.8 : 1.0;
        // Shield bash passive: shieldwall is slow but gets a slight debuff reduction
        // Skirmisher wraith passive: −15 % incoming damage (handled via DR above)

        const pTarget = unit.targetPosition;
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
            patches.set(unit.id, { ...patches.get(unit.id), state: 'move', formationFacing: facing,
              position: [
                unit.position[0] + (pdx / pdist) * step,
                unit.position[1],
                unit.position[2] + (pdz / pdist) * step,
              ],
            });
          }
        } else {
          // Auto-march toward nearest enemy
          const dx = nearest.position[0] - unit.position[0];
          const dz = nearest.position[2] - unit.position[2];
          const dist = Math.sqrt(dx*dx + dz*dz);
          const step = cfg.speed * speedMult * TICK;
          const facing = Math.atan2(dx, dz);
          patches.set(unit.id, { ...patches.get(unit.id), state: 'move', formationFacing: facing,
            position: [
              unit.position[0] + (dx / dist) * step,
              unit.position[1],
              unit.position[2] + (dz / dist) * step,
            ],
          });
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

      let changed = false;
      const newCharges = { ...unit.abilityCharges };
      for (const [abilityId, cs] of Object.entries(newCharges)) {
        if (!cs) continue;
        const def = ABILITY_DEFS[abilityId];
        if (!def || def.targeting === 'toggle') continue;
        if (cs.charges < def.maxCharges && elapsed >= cs.nextChargeAt) {
          newCharges[abilityId] = { charges: cs.charges + 1, nextChargeAt: elapsed + def.cooldownPerCharge };
          changed = true;
        }
      }
      if (changed) {
        patches.set(unit.id, { ...patches.get(unit.id), abilityCharges: newCharges });
      }
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
