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

    const { units, updateUnit, removeUnit, setTeamScore, teamScores } = useGameStore.getState();

    const living = units.filter(u => u.state !== 'dead');

    for (const unit of living) {
      const cfg = UNIT_CONFIG[unit.type];

      // Find nearest enemy
      let nearest: UnitData | null = null;
      let minDist = Infinity;

      for (const other of living) {
        if (other.teamId === unit.teamId) continue;
        const dx = unit.position[0] - other.position[0];
        const dz = unit.position[2] - other.position[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < minDist) { minDist = dist; nearest = other; }
      }

      if (!nearest) {
        if (unit.state !== 'idle') updateUnit(unit.id, { state: 'idle' });
        continue;
      }

      if (minDist <= cfg.attackRange) {
        // In attack range — face and attack
        if (unit.state !== 'attack') updateUnit(unit.id, { state: 'attack' });

        const timer = attackTimers[unit.id] ?? 0;
        if (now - timer >= cfg.attackCooldown) {
          attackTimers[unit.id] = now;

          const newHp = Math.max(0, nearest.health - cfg.damage);
          if (newHp <= 0) {
            updateUnit(nearest.id, { health: 0, state: 'dead' });
            // Remove after death animation
            setTimeout(() => removeUnit(nearest!.id), 1200);
            // Score point for killing team
            const scores = useGameStore.getState().teamScores;
            setTeamScore(unit.teamId, unit.teamId === 1 ? scores.team1 + 1 : scores.team2 + 1);
            delete attackTimers[nearest.id];
          } else {
            updateUnit(nearest.id, { health: newHp });
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

        if (unit.state !== 'move') updateUnit(unit.id, { state: 'move' });
        updateUnit(unit.id, {
          targetPosition: nearest.position,
          position: [nx, unit.position[1], nz],
        });
      }
    }
  });

  return null;
}
