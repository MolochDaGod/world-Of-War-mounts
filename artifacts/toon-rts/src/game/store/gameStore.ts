import { create } from 'zustand';
import { Vector3 } from 'three';

export type Race = 'Barbarians' | 'Dwarves' | 'Elves' | 'Orcs' | 'Undead' | 'WesternKingdoms';
export type UnitType = 'infantry' | 'cavalry' | 'mage' | 'boltThrower' | 'catapult';
export type UnitState = 'idle' | 'move' | 'attack' | 'dead';
export type AbilityType = 'fire' | 'ice' | 'lightning' | 'meteor' | 'wind';
export type GamePhase = 'menu' | 'setup' | 'battle' | 'victory';

export interface UnitData {
  id: string;
  race: Race;
  type: UnitType;
  position: [number, number, number];
  targetPosition?: [number, number, number];
  health: number;
  maxHealth: number;
  state: UnitState;
  teamId: 1 | 2;
}

export interface AbilityTarget {
  origin: [number, number, number];
  direction: [number, number, number];
  distance: number;
}

interface GameState {
  selectedRace: Race;
  units: UnitData[];
  activeAbility: AbilityType | null;
  abilityTarget: AbilityTarget | null;
  activeCasts: { id: string, type: AbilityType, target: AbilityTarget, startTime: number }[];
  selectedUnitIds: string[];
  phase: GamePhase;
  teamScores: { team1: number; team2: number };
  castingPath: [number, number, number][];
  
  setPhase: (phase: GamePhase) => void;
  setSelectedRace: (race: Race) => void;
  setActiveAbility: (ability: AbilityType | null) => void;
  setAbilityTarget: (target: AbilityTarget | null) => void;
  castAbility: (type: AbilityType, target: AbilityTarget) => void;
  removeCast: (id: string) => void;
  setCastingPath: (path: [number, number, number][]) => void;
  selectUnits: (ids: string[]) => void;
  addUnit: (unit: UnitData) => void;
  updateUnit: (id: string, updates: Partial<UnitData>) => void;
  removeUnit: (id: string) => void;
  setTeamScore: (team: 1 | 2, score: number) => void;
  spawnInitialArmies: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  selectedRace: 'WesternKingdoms',
  units: [],
  activeAbility: null,
  abilityTarget: null,
  activeCasts: [],
  selectedUnitIds: [],
  phase: 'menu',
  teamScores: { team1: 0, team2: 0 },
  castingPath: [],

  setPhase: (phase) => set({ phase }),
  setSelectedRace: (selectedRace) => set({ selectedRace }),
  setActiveAbility: (activeAbility) => set({ activeAbility }),
  setAbilityTarget: (abilityTarget) => set({ abilityTarget }),
  castAbility: (type, target) => set((state) => ({
    activeCasts: [...state.activeCasts, { id: Math.random().toString(), type, target, startTime: Date.now() }]
  })),
  removeCast: (id) => set((state) => ({
    activeCasts: state.activeCasts.filter(c => c.id !== id)
  })),
  setCastingPath: (castingPath) => set({ castingPath }),
  selectUnits: (selectedUnitIds) => set({ selectedUnitIds }),
  
  addUnit: (unit) => set((state) => ({ units: [...state.units, unit] })),
  
  updateUnit: (id, updates) => set((state) => ({
    units: state.units.map(u => u.id === id ? { ...u, ...updates } : u)
  })),
  
  removeUnit: (id) => set((state) => ({
    units: state.units.filter(u => u.id !== id),
    selectedUnitIds: state.selectedUnitIds.filter(selId => selId !== id)
  })),
  
  setTeamScore: (team, score) => set((state) => ({
    teamScores: {
      ...state.teamScores,
      [`team${team}`]: score
    }
  })),

  spawnInitialArmies: () => {
    const { selectedRace } = get();
    const newUnits: UnitData[] = [];
    let idCounter = 0;
    
    // Team 1
    for(let i = 0; i < 5; i++) {
      newUnits.push({
        id: `t1_inf_${idCounter++}`, race: selectedRace, type: 'infantry',
        position: [-10 + i * 2, 0, 10], health: 80, maxHealth: 80, state: 'idle', teamId: 1
      });
    }
    newUnits.push({
      id: `t1_cav_1`, race: selectedRace, type: 'cavalry',
      position: [-5, 0, 15], health: 140, maxHealth: 140, state: 'idle', teamId: 1
    });
    newUnits.push({
      id: `t1_siege_1`, race: selectedRace, type: 'catapult',
      position: [0, 0, 20], health: 150, maxHealth: 150, state: 'idle', teamId: 1
    });

    // Team 2 (Orcs)
    for(let i = 0; i < 5; i++) {
      newUnits.push({
        id: `t2_inf_${idCounter++}`, race: 'Orcs', type: 'infantry',
        position: [-10 + i * 2, 0, -10], health: 80, maxHealth: 80, state: 'idle', teamId: 2
      });
    }
    
    set({ units: newUnits, phase: 'battle' });
  }
}));
