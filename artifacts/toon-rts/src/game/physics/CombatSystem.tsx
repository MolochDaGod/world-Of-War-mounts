/**
 * CombatSystem — 30Hz regiment-scale combat with projectile emission.
 *
 * Key changes from per-soldier version:
 *  - Each UnitData is now a REGIMENT with high HP (2000–3000).
 *  - Damage is scaled to regiment level (180–400 per hit).
 *  - Ranged units call emitProjectile() so ProjectileSystem renders the bolt/arrow/stone.
 *  - Mages fire magic orbs using the same projectile system.
 *  - Single batchCombatTick per frame to keep Zustand notifications minimal.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore, UnitData } from '../store/gameStore';
import { emitProjectile, ProjectileKind } from '../effects/ProjectileSystem';
import { ROSTER_MAP } from '../data/UnitRoster';

// ── Combat config per regiment type ──────────────────────────────────────────
const UNIT_CONFIG: Record<UnitData['type'], {
  damage: number;
  attackRange: number;  // world units — distance between regiment centres
  speed: number;        // world units per second (regiment march speed)
  attackCooldown: number; // seconds between hits
}> = {
  // Legacy
  infantry:    { damage: 180, attackRange: 6,  speed: 4.5, attackCooldown: 1.0 },
  // Melee
  swordsmen:   { damage: 180, attackRange: 6,  speed: 4.5, attackCooldown: 1.0 },
  spearmen:    { damage: 150, attackRange: 8,  speed: 4.0, attackCooldown: 1.0 },
  shieldwall:  { damage: 120, attackRange: 5,  speed: 2.5, attackCooldown: 1.5 },
  skirmishers: { damage: 130, attackRange: 6,  speed: 6.5, attackCooldown: 0.8 },
  // Ranged infantry
  archers:     { damage: 100, attackRange: 18, speed: 3.5, attackCooldown: 1.8 },
  // Cavalry
  cavalry:     { damage: 250, attackRange: 7,  speed: 8.0, attackCooldown: 0.8 },
  heavyCavalry:{ damage: 350, attackRange: 8,  speed: 7.0, attackCooldown: 1.2 },
  // Casters / siege
  mage:        { damage: 200, attackRange: 14, speed: 2.5, attackCooldown: 2.0 },
  boltThrower: { damage: 280, attackRange: 26, speed: 1.5, attackCooldown: 3.0 },
  catapult:    { damage: 400, attackRange: 32, speed: 1.2, attackCooldown: 4.0 },
};

// Ranged unit types that emit visible projectiles
const RANGED_TYPES = new Set<UnitData['type']>([
  'archers', 'mage', 'boltThrower', 'catapult',
]);

function projectileKind(type: UnitData['type']): ProjectileKind {
  if (type === 'mage')        return 'magic';
  if (type === 'boltThrower') return 'bolt';
  if (type === 'catapult')    return 'stone';
  return 'arrow'; // archers
}

// Per-regiment attack cooldown tracker
const attackTimers: Record<string, number> = {};

export function CombatSystem() {
  const lastUpdate = useRef(0);

  useFrame((state) => {
    const now = state.clock.elapsedTime;
    if (now - lastUpdate.current < 0.033) return; // ~30Hz
    lastUpdate.current = now;

    const { units, batchCombatTick, batchRemoveUnits } = useGameStore.getState();
    const living = units.filter(u => u.state !== 'dead');

    const patches   = new Map<string, Partial<UnitData>>();
    const kills: { killedId: string }[] = [];
    let scoreDelta1 = 0;
    let scoreDelta2 = 0;

    for (const unit of living) {
      if (patches.get(unit.id)?.state === 'dead') continue;

      const cfg = UNIT_CONFIG[unit.type] ?? UNIT_CONFIG.swordsmen;

      // Find nearest living enemy regiment (by centre-to-centre distance)
      let nearest: UnitData | null = null;
      let minDist = Infinity;
      for (const other of living) {
        if (other.teamId === unit.teamId) continue;
        if (patches.get(other.id)?.state === 'dead') continue;
        const dx = unit.position[0] - other.position[0];
        const dz = unit.position[2] - other.position[2];
        const d  = Math.sqrt(dx * dx + dz * dz);
        if (d < minDist) { minDist = d; nearest = other; }
      }

      if (!nearest) {
        if (unit.state !== 'idle') patches.set(unit.id, { ...patches.get(unit.id), state: 'idle' });
        continue;
      }

      const inRange = minDist <= cfg.attackRange;

      // ── LOB MODE: siege unit fires at forced target position ──────────────
      if (unit.lobTarget && (unit.type === 'catapult' || unit.type === 'boltThrower')) {
        if (unit.state !== 'attack') patches.set(unit.id, { ...patches.get(unit.id), state: 'attack' });
        const timer = attackTimers[unit.id] ?? 0;
        if (now - timer >= cfg.attackCooldown) {
          attackTimers[unit.id] = now;
          const lt = unit.lobTarget;
          const spread = (): [number,number,number] => [
            lt[0] + (Math.random() - 0.5) * 4,
            0,
            lt[2] + (Math.random() - 0.5) * 4,
          ];
          emitProjectile(unit.position, spread(), projectileKind(unit.type));
        }
        continue;
      }

      if (inRange) {
        // Attack
        if (unit.state !== 'attack') patches.set(unit.id, { ...patches.get(unit.id), state: 'attack' });

        const timer = attackTimers[unit.id] ?? 0;
        if (now - timer >= cfg.attackCooldown) {
          attackTimers[unit.id] = now;

          // Emit projectile for ranged units
          if (RANGED_TYPES.has(unit.type)) {
            const kind = projectileKind(unit.type);
            const jitter = (): [number,number,number] => [
              nearest!.position[0] + (Math.random() - 0.5) * 2,
              nearest!.position[1],
              nearest!.position[2] + (Math.random() - 0.5) * 2,
            ];
            emitProjectile(unit.position, jitter(), kind);
          }

          // Apply damage
          const nearPatch = patches.get(nearest.id);
          const curHp = nearPatch?.health ?? nearest.health;
          const newHp = Math.max(0, curHp - cfg.damage);

          if (newHp <= 0) {
            patches.set(nearest.id, { ...nearPatch, health: 0, state: 'dead' });
            kills.push({ killedId: nearest.id });
            delete attackTimers[nearest.id];
            if (unit.teamId === 1) scoreDelta1++; else scoreDelta2++;
          } else {
            patches.set(nearest.id, { ...nearPatch, health: newHp });
          }
        }
      } else {
        // ── Player-issued move / patrol / attack-move priority ───────────────
        const pTarget = unit.targetPosition;
        if (pTarget) {
          const pdx = pTarget[0] - unit.position[0];
          const pdz = pTarget[2] - unit.position[2];
          const pdist = Math.sqrt(pdx * pdx + pdz * pdz);

          if (pdist < 3) {
            // Arrived at waypoint
            if (unit.patrolA && unit.patrolB) {
              // Patrol: bounce to the other leg
              const nextWp  = unit.patrolToB ? unit.patrolB : unit.patrolA;
              patches.set(unit.id, {
                ...patches.get(unit.id),
                targetPosition: nextWp,
                patrolToB: !unit.patrolToB,
                state: 'idle',
              });
            } else {
              patches.set(unit.id, { ...patches.get(unit.id), targetPosition: undefined, state: 'idle' });
            }
          } else {
            // Check attack-move: engage any enemy within attack range on the way
            if (unit.attackMove && nearest && minDist <= cfg.attackRange) {
              // Switch to attacking this tick (handled above via inRange path next tick)
            }
            const step = cfg.speed * 0.033;
            const facing = Math.atan2(pdx, pdz);
            patches.set(unit.id, {
              ...patches.get(unit.id),
              state: 'move',
              formationFacing: facing,
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
          const dist = Math.sqrt(dx * dx + dz * dz);
          const step = cfg.speed * 0.033;
          const facing = Math.atan2(dx, dz);
          patches.set(unit.id, {
            ...patches.get(unit.id),
            state: 'move',
            formationFacing: facing,
            position: [
              unit.position[0] + (dx / dist) * step,
              unit.position[1],
              unit.position[2] + (dz / dist) * step,
            ],
          });
        }
      }
    }

    if (patches.size > 0 || scoreDelta1 > 0 || scoreDelta2 > 0) {
      batchCombatTick(patches, scoreDelta1, scoreDelta2);
    }

    if (kills.length > 0) {
      const killedIds = kills.map(k => k.killedId);
      setTimeout(() => batchRemoveUnits(killedIds), 1400);
    }

    // ── Victory detection ──────────────────────────────────────────────────
    const { setPhase, phase } = useGameStore.getState();
    if (phase === 'battle') {
      const aliveTeam1 = living.filter(u => u.teamId === 1 && !patches.get(u.id)?.state?.includes('dead')).length;
      const aliveTeam2 = living.filter(u => u.teamId === 2 && !patches.get(u.id)?.state?.includes('dead')).length;
      if (living.length > 0 && (aliveTeam1 === 0 || aliveTeam2 === 0)) {
        setTimeout(() => setPhase('victory'), 1600);
      }
    }
  });

  return null;
}
