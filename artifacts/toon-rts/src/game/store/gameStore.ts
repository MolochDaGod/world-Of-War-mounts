import { create } from 'zustand';

export type Race = 'Barbarians' | 'Dwarves' | 'Elves' | 'Orcs' | 'Undead' | 'WesternKingdoms';
export type UnitType = 'infantry' | 'cavalry' | 'mage' | 'boltThrower' | 'catapult';
export type UnitState = 'idle' | 'move' | 'attack' | 'dead';
export type AbilityType = 'fire' | 'ice' | 'lightning' | 'meteor' | 'wind';
export type GamePhase = 'menu' | 'setup' | 'battle' | 'victory';
export type Difficulty = 'easy' | 'normal' | 'hard';

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
  enemyRace: Race;
  units: UnitData[];
  activeAbility: AbilityType | null;
  abilityTarget: AbilityTarget | null;
  activeCasts: { id: string; type: AbilityType; target: AbilityTarget; startTime: number }[];
  selectedUnitIds: string[];
  phase: GamePhase;
  difficulty: Difficulty;
  teamScores: { team1: number; team2: number };
  castingPath: [number, number, number][];

  setPhase: (phase: GamePhase) => void;
  setSelectedRace: (race: Race) => void;
  setEnemyRace: (race: Race) => void;
  setActiveAbility: (ability: AbilityType | null) => void;
  setAbilityTarget: (target: AbilityTarget | null) => void;
  castAbility: (type: AbilityType, target: AbilityTarget) => void;
  removeCast: (id: string) => void;
  setCastingPath: (path: [number, number, number][]) => void;
  selectUnits: (ids: string[]) => void;
  addUnit: (unit: UnitData) => void;
  updateUnit: (id: string, updates: Partial<UnitData>) => void;
  batchUpdateUnits: (updates: Map<string, Partial<UnitData>>) => void;
  /**
   * Single-set combat tick: applies unit patches AND score increments atomically.
   * Use instead of calling batchUpdateUnits + setTeamScore separately so that
   * only ONE useSyncExternalStore notification fires per combat tick.
   */
  batchCombatTick: (
    patches: Map<string, Partial<UnitData>>,
    scoreDelta1: number,
    scoreDelta2: number,
  ) => void;
  removeUnit: (id: string) => void;
  setTeamScore: (team: 1 | 2, score: number) => void;
  setDifficulty: (d: Difficulty) => void;
  spawnInitialArmies: () => void;
  resetGame: () => void;
}

// Stable uid counter
let uidCounter = 0;
function uid() { return `u_${++uidCounter}`; }

export const useGameStore = create<GameState>((set, get) => ({
  selectedRace: 'WesternKingdoms',
  enemyRace: 'Orcs',
  units: [],
  activeAbility: null,
  abilityTarget: null,
  activeCasts: [],
  selectedUnitIds: [],
  phase: 'menu',
  difficulty: 'normal',
  teamScores: { team1: 0, team2: 0 },
  castingPath: [],

  setPhase: (phase) => set({ phase }),
  setSelectedRace: (selectedRace) => set({ selectedRace }),
  setEnemyRace: (enemyRace) => set({ enemyRace }),
  setActiveAbility: (activeAbility) => set({ activeAbility }),
  setAbilityTarget: (abilityTarget) => set({ abilityTarget }),

  castAbility: (type, target) => set((state) => ({
    activeCasts: [...state.activeCasts, {
      id: `cast_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      type, target, startTime: Date.now(),
    }],
  })),

  removeCast: (id) => set((state) => ({
    activeCasts: state.activeCasts.filter(c => c.id !== id),
  })),

  setCastingPath: (castingPath) => set({ castingPath }),
  selectUnits: (selectedUnitIds) => set({ selectedUnitIds }),
  addUnit: (unit) => set((state) => ({ units: [...state.units, unit] })),

  updateUnit: (id, updates) => set((state) => ({
    units: state.units.map(u => u.id === id ? { ...u, ...updates } : u),
  })),

  batchUpdateUnits: (updates) => set((state) => ({
    units: state.units.map(u => {
      const patch = updates.get(u.id);
      return patch ? { ...u, ...patch } : u;
    }),
  })),

  batchCombatTick: (patches, scoreDelta1, scoreDelta2) => set((state) => ({
    units: state.units.map(u => {
      const patch = patches.get(u.id);
      return patch ? { ...u, ...patch } : u;
    }),
    teamScores: {
      team1: state.teamScores.team1 + scoreDelta1,
      team2: state.teamScores.team2 + scoreDelta2,
    },
  })),

  removeUnit: (id) => set((state) => ({
    units: state.units.filter(u => u.id !== id),
    selectedUnitIds: state.selectedUnitIds.filter(s => s !== id),
  })),

  setTeamScore: (team, score) => set((state) => ({
    teamScores: { ...state.teamScores, [`team${team}`]: score },
  })),

  setDifficulty: (difficulty) => set({ difficulty }),

  resetGame: () => set({ units: [], phase: 'menu', teamScores: { team1: 0, team2: 0 } }),

  spawnInitialArmies: () => {
    const { selectedRace, enemyRace, difficulty } = get();
    const diffMult = difficulty === 'easy' ? 0.7 : difficulty === 'hard' ? 1.4 : 1.0;
    const newUnits: UnitData[] = [];

    // Team 1 — player's faction
    for (let i = 0; i < 6; i++) {
      newUnits.push({
        id: uid(), race: selectedRace, type: 'infantry',
        position: [-12 + i * 4, 0, 16],
        health: 80, maxHealth: 80, state: 'idle', teamId: 1,
      });
    }
    // Cavalry flanks
    newUnits.push({ id: uid(), race: selectedRace, type: 'cavalry', position: [-18, 0, 12], health: 140, maxHealth: 140, state: 'idle', teamId: 1 });
    newUnits.push({ id: uid(), race: selectedRace, type: 'cavalry', position: [ 18, 0, 12], health: 140, maxHealth: 140, state: 'idle', teamId: 1 });
    // Siege at back
    if (selectedRace === 'Orcs' || selectedRace === 'WesternKingdoms') {
      newUnits.push({ id: uid(), race: selectedRace, type: 'catapult', position: [0, 0, 22], health: 200, maxHealth: 200, state: 'idle', teamId: 1 });
    } else if (selectedRace === 'Elves') {
      newUnits.push({ id: uid(), race: selectedRace, type: 'boltThrower', position: [0, 0, 22], health: 180, maxHealth: 180, state: 'idle', teamId: 1 });
    } else {
      newUnits.push({ id: uid(), race: selectedRace, type: 'mage', position: [0, 0, 22], health: 60, maxHealth: 60, state: 'idle', teamId: 1 });
    }

    // Team 2 — enemy faction (mirrored positions, scaled by difficulty)
    const eInfHP  = Math.round(80  * diffMult);
    const eCavHP  = Math.round(140 * diffMult);
    const eSiegeHP= Math.round(200 * diffMult);
    const eMageHP = Math.round(60  * diffMult);
    const eBoltHP = Math.round(180 * diffMult);
    for (let i = 0; i < 6; i++) {
      newUnits.push({
        id: uid(), race: enemyRace, type: 'infantry',
        position: [-12 + i * 4, 0, -16],
        health: eInfHP, maxHealth: eInfHP, state: 'idle', teamId: 2,
      });
    }
    newUnits.push({ id: uid(), race: enemyRace, type: 'cavalry', position: [-18, 0, -12], health: eCavHP, maxHealth: eCavHP, state: 'idle', teamId: 2 });
    newUnits.push({ id: uid(), race: enemyRace, type: 'cavalry', position: [ 18, 0, -12], health: eCavHP, maxHealth: eCavHP, state: 'idle', teamId: 2 });
    if (enemyRace === 'Orcs' || enemyRace === 'WesternKingdoms') {
      newUnits.push({ id: uid(), race: enemyRace, type: 'catapult', position: [0, 0, -22], health: eSiegeHP, maxHealth: eSiegeHP, state: 'idle', teamId: 2 });
    } else if (enemyRace === 'Elves') {
      newUnits.push({ id: uid(), race: enemyRace, type: 'boltThrower', position: [0, 0, -22], health: eBoltHP, maxHealth: eBoltHP, state: 'idle', teamId: 2 });
    } else {
      newUnits.push({ id: uid(), race: enemyRace, type: 'mage', position: [0, 0, -22], health: eMageHP, maxHealth: eMageHP, state: 'idle', teamId: 2 });
    }

    set({ units: newUnits, phase: 'battle', teamScores: { team1: 0, team2: 0 } });
  },
}));
