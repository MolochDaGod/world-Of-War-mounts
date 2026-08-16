import { useFrame } from '@react-three/fiber';
import { useGameStore, UnitData } from '../store/gameStore';
import * as THREE from 'three';

export function CombatSystem() {
  const { units, updateUnit, removeUnit, setTeamScore } = useGameStore();

  useFrame((state, delta) => {
    const unitsData = useGameStore.getState().units;
    
    // Very simple combat loop
    unitsData.forEach(unit => {
      if (unit.state === 'dead') return;

      // Find nearest enemy
      let nearestEnemy = null as UnitData | null;
      let minDist = Infinity;

      unitsData.forEach(other => {
        if (other.teamId !== unit.teamId && other.state !== 'dead') {
          const dx = unit.position[0] - other.position[0];
          const dz = unit.position[2] - other.position[2];
          const dist = Math.sqrt(dx*dx + dz*dz);
          
          if (dist < minDist) {
            minDist = dist;
            nearestEnemy = other;
          }
        }
      });

      if (nearestEnemy) {
        const enemy: UnitData = nearestEnemy;
        const attackRange = unit.type === 'catapult' ? 15 : (unit.type === 'cavalry' ? 2.5 : 2);
        
        if (minDist <= attackRange) {
          // Attack!
          updateUnit(unit.id, { state: 'attack' });
          
          // Apply damage (rate-limited in a real app, here simplified per frame/probabilistic)
          if (Math.random() < 0.02) { // roughly once per second at 60fps
            const damage = unit.type === 'catapult' ? 30 : 10;
            const newHealth = Math.max(0, enemy.health - damage);
            
            updateUnit(enemy.id, { 
              health: newHealth,
              state: newHealth <= 0 ? 'dead' : enemy.state 
            });

            if (newHealth <= 0) {
              setTimeout(() => removeUnit(enemy.id), 1000);
              const scores = useGameStore.getState().teamScores;
              setTeamScore(unit.teamId, unit.teamId === 1 ? scores.team1 + 1 : scores.team2 + 1);
            }
          }
        } else {
          // Move towards enemy
          updateUnit(unit.id, { 
            state: 'move',
            targetPosition: enemy.position 
          });
        }
      } else {
        updateUnit(unit.id, { state: 'idle' });
      }
    });
  });

  return null;
}
