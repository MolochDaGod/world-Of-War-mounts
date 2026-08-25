import { create } from 'zustand';
import { createWarZoneObstacles, type WarZoneObstacle } from '../world/warZoneData.ts';
import { applyWarZoneObstacleDamage } from '../world/warZoneState.ts';

interface WarZoneState {
  obstacles: WarZoneObstacle[];
  damageObstacle: (obstacleId: string, damage: number) => void;
  damageObstacles: (damage: { id: string; amount: number }[]) => void;
  resetObstacles: () => void;
}

export const useWarZoneStore = create<WarZoneState>((set) => ({
  obstacles: createWarZoneObstacles(),

  damageObstacle: (obstacleId, damage) => {
    if (damage <= 0) return;
    set((state) => ({
      obstacles: applyWarZoneObstacleDamage(
        state.obstacles,
        new Map([[obstacleId, damage]]),
      ),
    }));
  },

  damageObstacles: (damage) => {
    if (damage.length === 0) return;
    const damageById = new Map<string, number>();
    for (const entry of damage) {
      if (entry.amount > 0) {
        damageById.set(entry.id, (damageById.get(entry.id) ?? 0) + entry.amount);
      }
    }
    if (damageById.size === 0) return;
    set((state) => {
      const obstacles = applyWarZoneObstacleDamage(state.obstacles, damageById);
      return obstacles === state.obstacles ? {} : { obstacles };
    });
  },

  resetObstacles: () => set({ obstacles: createWarZoneObstacles() }),
}));