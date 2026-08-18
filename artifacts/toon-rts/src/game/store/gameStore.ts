import { create } from 'zustand';

export type Race = 'Barbarians' | 'Dwarves' | 'Elves' | 'Orcs' | 'Undead' | 'WesternKingdoms';

export type UnitType =
  | 'infantry'      // legacy alias for swordsmen
  | 'swordsmen'     // basic melee
  | 'spearmen'      // anti-cavalry
  | 'shieldwall'    // heavy defensive
  | 'archers'       // ranged infantry
  | 'skirmishers'   // fast light infantry
  | 'cavalry'       // mounted
  | 'heavyCavalry'  // charging cavalry
  | 'mage'          // spell casters
  | 'boltThrower'   // long-range bolt weapon
  | 'catapult';     // siege artillery

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
  // Regiment data
  maxSoldiers: number;    // visual soldier count at full health
  formationRows: number;
  formationCols: number;
  formationFacing: number; // Y rotation in radians
  spacing: number;         // formation slot spacing in world units
  // RTS command orders
  attackMove?: boolean;                           // move & engage any enemy on the way
  patrolA?: [number, number, number];             // patrol waypoint A
  patrolB?: [number, number, number];             // patrol waypoint B
  patrolToB?: boolean;                            // which leg of patrol we're on
  lobTarget?: [number, number, number];           // artillery forced target
}

export interface AbilityTarget {
  origin: [number, number, number];
  direction: [number, number, number];
  distance: number;
}

/** Army builder regiment selection — maxSoldiers/hp override from faction data */
export interface RegimentSlot {
  unitType:    UnitType;
  maxSoldiers?: number;  // faction-specific soldier count (overrides REGIMENT_DEFS)
  hpOverride?:  number;  // faction-specific HP pool
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

  /** Army builder state */
  playerArmy: RegimentSlot[];   // selected by player (max 8)
  enemyArmy: RegimentSlot[];    // AI-selected
  gold: number;                 // player's gold budget

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
  batchCombatTick: (
    patches: Map<string, Partial<UnitData>>,
    scoreDelta1: number,
    scoreDelta2: number,
  ) => void;
  removeUnit: (id: string) => void;
  batchRemoveUnits: (ids: string[]) => void;
  setTeamScore: (team: 1 | 2, score: number) => void;
  setDifficulty: (d: Difficulty) => void;

  /** Army builder actions */
  addToPlayerArmy: (slot: RegimentSlot) => void;
  removeFromPlayerArmy: (index: number) => void;
  clearPlayerArmy: () => void;

  /** Player-issued RTS move command target (for move marker VFX) */
  commandTarget: [number, number, number] | null;

  /** Spawn armies from builder selections and start battle */
  spawnArmies: () => void;
  /** Legacy — spawns a default army without builder */
  spawnInitialArmies: () => void;
  resetGame: () => void;

  /** RTS commands */
  issueMove:        (unitIds: string[], targetPosition: [number, number, number]) => void;
  issueAttackMove:  (unitIds: string[], targetPosition: [number, number, number]) => void;
  issuePatrol:      (unitIds: string[], patrolA: [number,number,number], patrolB: [number,number,number]) => void;
  issueLob:         (unitIds: string[], target: [number, number, number]) => void;
  issueStop:        (unitIds: string[]) => void;
  setCommandTarget: (pos: [number, number, number] | null) => void;
}

let uidCounter = 0;
function uid() { return `u_${++uidCounter}`; }

// ── Regiment definitions — stats per type ──────────────────────────────────────
export const REGIMENT_DEFS: Record<UnitType, {
  hp: number; maxSoldiers: number; formationRows: number; formationCols: number;
  spacing: number; cost: number;
}> = {
  infantry:    { hp: 2000, maxSoldiers: 16, formationRows: 4, formationCols: 4, spacing: 1.2, cost: 100 },
  swordsmen:   { hp: 2000, maxSoldiers: 16, formationRows: 4, formationCols: 4, spacing: 1.2, cost: 100 },
  spearmen:    { hp: 1800, maxSoldiers: 12, formationRows: 3, formationCols: 4, spacing: 1.2, cost: 120 },
  shieldwall:  { hp: 3000, maxSoldiers: 10, formationRows: 2, formationCols: 5, spacing: 1.4, cost: 200 },
  archers:     { hp: 1200, maxSoldiers: 12, formationRows: 3, formationCols: 4, spacing: 1.2, cost: 150 },
  skirmishers: { hp: 1000, maxSoldiers: 8,  formationRows: 2, formationCols: 4, spacing: 1.2, cost: 100 },
  cavalry:     { hp: 1800, maxSoldiers: 8,  formationRows: 2, formationCols: 4, spacing: 2.0, cost: 200 },
  heavyCavalry:{ hp: 2200, maxSoldiers: 6,  formationRows: 2, formationCols: 3, spacing: 2.4, cost: 350 },
  mage:        { hp: 800,  maxSoldiers: 4,  formationRows: 2, formationCols: 2, spacing: 2.0, cost: 300 },
  boltThrower: { hp: 1200, maxSoldiers: 2,  formationRows: 1, formationCols: 2, spacing: 3.0, cost: 350 },
  catapult:    { hp: 800,  maxSoldiers: 1,  formationRows: 1, formationCols: 1, spacing: 1.0, cost: 400 },
};

// Categorise types for positioning
function regimentCategory(t: UnitType): 'melee' | 'ranged' | 'siege' {
  if (t === 'archers' || t === 'mage') return 'ranged';
  if (t === 'boltThrower' || t === 'catapult') return 'siege';
  return 'melee';
}

/** Compute line positions for an army. Team 1 uses positive Z, team 2 negative Z. */
function layoutArmyPositions(
  army: RegimentSlot[],
  teamId: 1 | 2,
): [number, number, number][] {
  const sign = teamId === 1 ? 1 : -1;
  const melee   = army.filter(s => regimentCategory(s.unitType) === 'melee');
  const ranged  = army.filter(s => regimentCategory(s.unitType) === 'ranged');
  const siege   = army.filter(s => regimentCategory(s.unitType) === 'siege');

  const positions: [number, number, number][] = [];

  const layoutLine = (group: RegimentSlot[], zBase: number) => {
    group.forEach((_, i) => {
      const x = (i - (group.length - 1) / 2) * 12;
      positions.push([x, 0, sign * zBase]);
    });
  };

  // Build in order matching original array so positions match indices
  const meleeStart = 0;
  const rangedStart = melee.length;
  const siegeStart  = melee.length + ranged.length;

  for (let i = 0; i < melee.length; i++) {
    const x = (i - (melee.length - 1) / 2) * 12;
    positions[meleeStart + i] = [x, 0, sign * 20];
  }
  for (let i = 0; i < ranged.length; i++) {
    const x = (i - (ranged.length - 1) / 2) * 14;
    positions[rangedStart + i] = [x, 0, sign * 34];
  }
  for (let i = 0; i < siege.length; i++) {
    const x = (i - (siege.length - 1) / 2) * 16;
    positions[siegeStart + i] = [x, 0, sign * 48];
  }
  return positions;
}

function buildUnits(army: RegimentSlot[], race: Race, teamId: 1 | 2, diffMult: number): UnitData[] {
  const positions = layoutArmyPositions(army, teamId);
  const facing = teamId === 1 ? Math.PI : 0; // team1 faces -Z toward enemy

  return army.map((slot, i) => {
    const def  = REGIMENT_DEFS[slot.unitType] ?? REGIMENT_DEFS.swordsmen;
    const hp   = Math.round((slot.hpOverride ?? def.hp) * diffMult);
    return {
      id: uid(),
      race,
      type: slot.unitType,
      position: positions[i] ?? [0, 0, teamId === 1 ? 20 : -20],
      health: hp,
      maxHealth: hp,
      state: 'idle',
      teamId,
      maxSoldiers: slot.maxSoldiers ?? def.maxSoldiers,
      formationRows: def.formationRows,
      formationCols: def.formationCols,
      formationFacing: facing,
      spacing: def.spacing,
    };
  });
}

/** AI picks an army up to the given gold budget */
function aiPickArmy(budget: number): RegimentSlot[] {
  const order: UnitType[] = [
    'swordsmen', 'spearmen', 'cavalry', 'archers', 'shieldwall',
    'skirmishers', 'heavyCavalry', 'mage', 'boltThrower', 'catapult',
  ];
  const slots: RegimentSlot[] = [];
  let remaining = budget;
  for (const t of order) {
    const cost = REGIMENT_DEFS[t].cost;
    if (remaining >= cost && slots.length < 8) {
      slots.push({ unitType: t });
      remaining -= cost;
    }
  }
  return slots.length > 0 ? slots : [{ unitType: 'swordsmen' }];
}

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
  playerArmy: [],
  enemyArmy: [],
  gold: 2000,
  commandTarget: null,

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
  batchRemoveUnits: (ids) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    set((state) => ({
      units: state.units.filter(u => !idSet.has(u.id)),
      selectedUnitIds: state.selectedUnitIds.filter(s => !idSet.has(s)),
    }));
  },
  setTeamScore: (team, score) => set((state) => ({
    teamScores: { ...state.teamScores, [`team${team}`]: score },
  })),
  setDifficulty: (difficulty) => set({ difficulty }),
  setCommandTarget: (commandTarget) => set({ commandTarget }),
  issueMove: (unitIds, targetPosition) => {
    const idSet = new Set(unitIds);
    set(state => ({
      commandTarget: targetPosition,
      units: state.units.map(u =>
        idSet.has(u.id) && u.state !== 'dead'
          ? { ...u, targetPosition, attackMove: false,
              patrolA: undefined, patrolB: undefined, lobTarget: undefined, state: 'move' }
          : u,
      ),
    }));
  },

  issueAttackMove: (unitIds, targetPosition) => {
    const idSet = new Set(unitIds);
    set(state => ({
      commandTarget: targetPosition,
      units: state.units.map(u =>
        idSet.has(u.id) && u.state !== 'dead'
          ? { ...u, targetPosition, attackMove: true,
              patrolA: undefined, patrolB: undefined, lobTarget: undefined, state: 'move' }
          : u,
      ),
    }));
  },

  issuePatrol: (unitIds, patrolA, patrolB) => {
    const idSet = new Set(unitIds);
    set(state => ({
      units: state.units.map(u =>
        idSet.has(u.id) && u.state !== 'dead'
          ? { ...u, patrolA, patrolB, patrolToB: true,
              targetPosition: patrolA, attackMove: false, lobTarget: undefined, state: 'move' }
          : u,
      ),
    }));
  },

  issueLob: (unitIds, target) => {
    const SIEGE = new Set(['catapult', 'boltThrower']);
    const idSet = new Set(unitIds);
    set(state => ({
      units: state.units.map(u =>
        idSet.has(u.id) && u.state !== 'dead' && SIEGE.has(u.type)
          ? { ...u, lobTarget: target, patrolA: undefined, patrolB: undefined, attackMove: false }
          : u,
      ),
    }));
  },

  issueStop: (unitIds) => {
    const idSet = new Set(unitIds);
    set(state => ({
      units: state.units.map(u =>
        idSet.has(u.id) && u.state !== 'dead'
          ? { ...u, targetPosition: undefined, attackMove: false,
              patrolA: undefined, patrolB: undefined, lobTarget: undefined, state: 'idle' }
          : u,
      ),
    }));
  },

  addToPlayerArmy: (slot) => set((state) => {
    if (state.playerArmy.length >= 8) return {};
    const cost = REGIMENT_DEFS[slot.unitType]?.cost ?? 100;
    if (state.gold < cost) return {};
    return { playerArmy: [...state.playerArmy, slot], gold: state.gold - cost };
  }),
  removeFromPlayerArmy: (index) => set((state) => {
    const removed = state.playerArmy[index];
    if (!removed) return {};
    const cost = REGIMENT_DEFS[removed.unitType]?.cost ?? 100;
    const next = [...state.playerArmy];
    next.splice(index, 1);
    return { playerArmy: next, gold: state.gold + cost };
  }),
  clearPlayerArmy: () => set((state) => ({
    playerArmy: [],
    gold: state.playerArmy.reduce(
      (sum, s) => sum + (REGIMENT_DEFS[s.unitType]?.cost ?? 100), 2000,
    ),
  })),

  spawnArmies: () => {
    const { selectedRace, enemyRace, difficulty, playerArmy } = get();
    const diffMult = difficulty === 'easy' ? 0.7 : difficulty === 'hard' ? 1.4 : 1.0;

    // If player built no army, give a default
    const pArmy = playerArmy.length > 0 ? playerArmy : [
      { unitType: 'swordsmen' as UnitType },
      { unitType: 'spearmen'  as UnitType },
      { unitType: 'cavalry'   as UnitType },
    ];

    // AI mirrors roughly: picks from budget equal to player's spend
    const playerSpend = pArmy.reduce((s, sl) => s + (REGIMENT_DEFS[sl.unitType]?.cost ?? 100), 0);
    const eArmy = aiPickArmy(Math.round(playerSpend * diffMult));

    const team1 = buildUnits(pArmy,  selectedRace, 1, 1.0);
    const team2 = buildUnits(eArmy,  enemyRace,    2, diffMult);

    set({
      units: [...team1, ...team2],
      phase: 'battle',
      teamScores: { team1: 0, team2: 0 },
      enemyArmy: eArmy,
    });
  },

  /** Legacy default army spawn */
  spawnInitialArmies: () => {
    const { selectedRace, enemyRace, difficulty } = get();
    const diffMult = difficulty === 'easy' ? 0.7 : difficulty === 'hard' ? 1.4 : 1.0;

    const pArmy: RegimentSlot[] = [
      { unitType: 'swordsmen' }, { unitType: 'spearmen' },
      { unitType: 'cavalry' },   { unitType: 'archers' },
    ];
    const eArmy = aiPickArmy(Math.round(800 * diffMult));

    const team1 = buildUnits(pArmy, selectedRace, 1, 1.0);
    const team2 = buildUnits(eArmy, enemyRace,    2, diffMult);

    set({
      units: [...team1, ...team2],
      phase: 'battle',
      teamScores: { team1: 0, team2: 0 },
    });
  },

  resetGame: () => set({
    units: [], phase: 'menu',
    teamScores: { team1: 0, team2: 0 },
    playerArmy: [], gold: 2000,
  }),
}));
