import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore, UnitData } from '../store/gameStore';

// Per-unit attack cooldown tracker — keyed by unit id
const attackTimers: Record<string, number> = {};

// Damage config by unit type
const UNIT_CONFIG: Record<UnitData['type'], {
  damage: number; attackRange: number; speed: number; attackCooldown: number;
}> = {
  infantry:    { damage: 12,  attackRange: 2.5, speed: 4.5, attackCooldown: 1.0 },
  cavalry:     { damage: 20,  attackRange: 3.0, speed: 8.0, attackCooldown: 0.8 },
  mage:        { damage: 8,   attackRange: 2.0, speed: 3.5, attackCooldown: 1.5 },
  boltThrower: { damage: 35,  attackRange: 18,  speed: 1.5, attackCooldown: 2.0 },
  catapult:    { damage: 55,  attackRange: 22,  speed: 1.2, attackCooldown: 3.0 },
};

export function CombatSystem() {
  const lastUpdate = useRef(0);

  useFrame((state) => {
    const now = state.clock.elapsedTime;

    // Run combat logic at 30hz to avoid per-frame Zustand thrashing
    if (now - lastUpdate.current < 0.033) return;
    lastUpdate.current = now;

    const { units, batchUpdateUnits, removeUnit, setTeamScore, teamScores } =
      useGameStore.getState();

    const living = units.filter(u => u.state !== 'dead');

    // Collect all unit patches for this tick — single store write at the end
    const patches = new Map<string, Partial<UnitData>>();
    // Collect kills so we can fire removeUnit timeouts after the batch
    const kills: { killerId: number; killedId: string }[] = [];
    // Accumulate score deltas: team1 and team2
    let scoreDelta1 = 0;
    let scoreDelta2 = 0;

    // Helper: get the current patched state of a unit (or its original state)
    const getPatch = (id: string, base: UnitData): Partial<UnitData> & Pick<UnitData, keyof UnitData> => {
      const existing = patches.get(id);
      return existing ? { ...base, ...existing } : base;
    };

    for (const unit of living) {
      // Skip if already marked dead by an earlier iteration this tick
      const unitPatch = patches.get(unit.id);
      if (unitPatch?.state === 'dead') continue;

      const cfg = UNIT_CONFIG[unit.type];

      // Find nearest living enemy — single scan per unit
      let nearest: UnitData | null = null;
      let minDist = Infinity;

      for (const other of living) {
        if (other.teamId === unit.teamId) continue;
        // Respect kills already decided this tick
        const otherPatch = patches.get(other.id);
        if (otherPatch?.state === 'dead') continue;

        const dx = unit.position[0] - other.position[0];
        const dz = unit.position[2] - other.position[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < minDist) { minDist = dist; nearest = other; }
      }

      if (!nearest) {
        if (unit.state !== 'idle') {
          patches.set(unit.id, { ...patches.get(unit.id), state: 'idle' });
        }
        continue;
      }

      if (minDist <= cfg.attackRange) {
        // In attack range — face and attack
        if (unit.state !== 'attack') {
          patches.set(unit.id, { ...patches.get(unit.id), state: 'attack' });
        }

        const timer = attackTimers[unit.id] ?? 0;
        if (now - timer >= cfg.attackCooldown) {
          attackTimers[unit.id] = now;

          // Use already-patched health for the target if it was hit this tick
          const nearestPatch = patches.get(nearest.id);
          const currentHp = nearestPatch?.health ?? nearest.health;
          const newHp = Math.max(0, currentHp - cfg.damage);

          if (newHp <= 0) {
            patches.set(nearest.id, { ...nearestPatch, health: 0, state: 'dead' });
            kills.push({ killerId: unit.teamId, killedId: nearest.id });
            delete attackTimers[nearest.id];
            if (unit.teamId === 1) scoreDelta1++; else scoreDelta2++;
          } else {
            patches.set(nearest.id, { ...nearestPatch, health: newHp });
          }
        }
      } else {
        // Move toward enemy
        const dx = nearest.position[0] - unit.position[0];
        const dz = nearest.position[2] - unit.position[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        const step = cfg.speed * 0.033; // step per combat tick (~30hz)
        const nx = unit.position[0] + (dx / dist) * step;
        const nz = unit.position[2] + (dz / dist) * step;

        patches.set(unit.id, {
          ...patches.get(unit.id),
          state: 'move',
          targetPosition: nearest.position,
          position: [nx, unit.position[1], nz],
        });
      }
    }

    // Single store write for all unit updates this tick
    if (patches.size > 0) {
      batchUpdateUnits(patches);
    }

    // Deferred unit removal after death animations
    for (const { killedId } of kills) {
      setTimeout(() => removeUnit(killedId), 1200);
    }

    // Apply score deltas using the teamScores already read at tick start
    if (scoreDelta1 > 0) setTeamScore(1, teamScores.team1 + scoreDelta1);
    if (scoreDelta2 > 0) setTeamScore(2, teamScores.team2 + scoreDelta2);
  });

  return null;
}
