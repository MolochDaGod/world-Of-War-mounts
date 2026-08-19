import { create } from 'zustand';
import { AbilityId, ABILITY_DEFS, TotemData } from '../data/AbilityDefs';
import { COMMANDER_BY_ID, getCommandersForRace } from '../data/CommanderDefs';

export type Race = 'Barbarians' | 'Dwarves' | 'Elves' | 'Orcs' | 'Undead' | 'WesternKingdoms';

export type UnitType =
  | 'infantry'        // legacy alias for swordsmen
  | 'swordsmen'       // basic melee
  | 'spearmen'        // anti-cavalry
  | 'shieldwall'      // heavy defensive
  | 'archers'         // ranged infantry
  | 'skirmishers'     // fast light infantry
  | 'cavalry'         // mounted
  | 'heavyCavalry'    // charging cavalry
  | 'mage'            // spell casters
  | 'boltThrower'     // long-range bolt weapon
  | 'catapult'        // siege artillery
  | 'grieeGlee'       // Orc+Goblin pair — stone-throw siege, close melee
  | 'skeletonWarrior' // Summoned skeleton horde — cheap, weak, many
  | 'meshyWarrior';   // Elite baked-GLB warrior (Meshy AI character)

export type UnitState = 'idle' | 'move' | 'attack' | 'dead';
export type AbilityType = 'fire' | 'ice' | 'lightning' | 'meteor' | 'wind' | 'poison' | 'thunder' | 'flame_blast';
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
  attackMove?: boolean;
  patrolA?: [number, number, number];
  patrolB?: [number, number, number];
  patrolToB?: boolean;
  lobTarget?: [number, number, number];
  // Status effects & ability state
  standGround?: boolean;
  phaseShift?: boolean;                        // untargetable by enemies
  phaseShiftUntil?: number;                    // combatElapsed seconds when it expires
  bleed?: { damage: number; ticks: number };   // bleed applied by Death Strike
  speedBoostUntil?: number;                    // combatElapsed when speed boost expires
  chargeBoost?: boolean;                       // next attack 3× damage (Charge / Death Strike)
  pendingBleed?: boolean;                      // next hit inflicts bleed (Death Strike only)
  lifedrainAura?: boolean;                     // Legion mage toggle — heals allies on hit
  shieldBashing?: boolean;                     // one-tick AOE shield bash (consumed in CombatSystem)
  multiShotReady?: boolean;                    // one-tick multi-shot flag
  // Per-ability charge tracker: abilityId → { charges, nextChargeAt (combatElapsed s) }
  abilityCharges?: Partial<Record<string, { charges: number; nextChargeAt: number }>>;
  // Commander hero fields
  isCommander?:        boolean;
  commanderArchetype?: string;   // CommanderDef id
  commanderName?:      string;   // display name
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
  playerCommander: string | null;  // chosen CommanderDef id (null = no commander)
  mapType: 'battlefield' | 'arena';
  setMapType: (t: 'battlefield' | 'arena') => void;

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

  commandTarget: [number, number, number] | null;

  // ── Ability system ──────────────────────────────────────────────────────────
  totems: TotemData[];
  bountyBursts: { id: string; position: [number,number,number]; radius: number; createdAt: number }[];
  combatElapsed: number;          // seconds since battle started (ticked by CombatSystem)
  pendingAbility: { abilityId: AbilityId; unitIds: string[] } | null;  // waiting for ground click

  /** Spawn armies from builder selections and start battle */
  spawnArmies: () => void;
  /** Legacy — spawns a default army without builder */
  spawnInitialArmies: () => void;
  resetGame: () => void;

  issueMove:        (unitIds: string[], targetPosition: [number, number, number]) => void;
  issueAttackMove:  (unitIds: string[], targetPosition: [number, number, number]) => void;
  issuePatrol:      (unitIds: string[], patrolA: [number,number,number], patrolB: [number,number,number]) => void;
  issueLob:         (unitIds: string[], target: [number, number, number]) => void;
  issueStop:        (unitIds: string[]) => void;
  toggleStandGround:(unitIds: string[]) => void;
  setCommandTarget: (pos: [number, number, number] | null) => void;
  setPlayerCommander: (id: string | null) => void;
  // ── Ability actions ─────────────────────────────────────────────────────────
  triggerAbility:   (unitIds: string[], abilityId: AbilityId, target?: [number,number,number]) => void;
  setPendingAbility:(pending: { abilityId: AbilityId; unitIds: string[] } | null) => void;
  placeTotem:       (totem: TotemData) => void;
  expireTotems:     (now: number) => void;
  expireBountyBursts:(now: number) => void;
  tickCombatElapsed:(delta: number) => void;
  regenAbilityCharges:(unitId: string, now: number) => void;
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
  boltThrower:    { hp: 1200, maxSoldiers: 2,  formationRows: 1, formationCols: 2, spacing: 3.0, cost: 350 },
  catapult:       { hp: 800,  maxSoldiers: 1,  formationRows: 1, formationCols: 1, spacing: 1.0, cost: 400 },
  // GLB-rendered units
  grieeGlee:      { hp: 3800, maxSoldiers: 3,  formationRows: 1, formationCols: 3, spacing: 5.0, cost: 500 },
  skeletonWarrior:{ hp: 500,  maxSoldiers: 10, formationRows: 2, formationCols: 5, spacing: 1.1, cost: 60  },
  meshyWarrior:   { hp: 2600, maxSoldiers: 8,  formationRows: 2, formationCols: 4, spacing: 1.6, cost: 250 },
};

// Categorise types for positioning
function regimentCategory(t: UnitType): 'melee' | 'ranged' | 'siege' {
  if (t === 'archers' || t === 'mage') return 'ranged';
  if (t === 'boltThrower' || t === 'catapult' || t === 'grieeGlee') return 'siege';
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
  playerCommander: null,
  mapType: 'battlefield' as const,
  commandTarget: null,
  totems: [],
  bountyBursts: [],
  combatElapsed: 0,
  pendingAbility: null,

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
  setPlayerCommander: (id) => set({ playerCommander: id }),
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

  toggleStandGround: (unitIds) => {
    const idSet = new Set(unitIds);
    set(state => {
      // Check current state of first selected unit to determine toggle direction
      const first = state.units.find(u => idSet.has(u.id) && u.state !== 'dead');
      const newVal = first ? !first.standGround : true;
      return {
        units: state.units.map(u =>
          idSet.has(u.id) && u.state !== 'dead'
            ? { ...u, standGround: newVal,
                // if enabling stand ground, cancel any movement order
                targetPosition: newVal ? undefined : u.targetPosition,
                state: newVal && u.state === 'move' ? 'idle' : u.state }
            : u,
        ),
      };
    });
  },

  // ── Ability system ──────────────────────────────────────────────────────────
  setPendingAbility: (pending) => set({ pendingAbility: pending }),

  placeTotem: (totem) => set(s => ({ totems: [...s.totems, totem] })),

  expireTotems: (now) => set(s => ({
    totems: s.totems.filter(t => t.expiresAt > now),
  })),

  expireBountyBursts: (now) => set(s => ({
    bountyBursts: s.bountyBursts.filter(b => (now - b.createdAt / 1000) < 2.5),
  })),

  tickCombatElapsed: (delta) => set(s => ({ combatElapsed: s.combatElapsed + delta })),

  regenAbilityCharges: (unitId, now) => set(s => {
    const unit = s.units.find(u => u.id === unitId);
    if (!unit || !unit.abilityCharges) return {};
    const newCharges = { ...unit.abilityCharges };
    let changed = false;
    for (const [abilityId, state] of Object.entries(newCharges)) {
      if (!state) continue;
      const def = ABILITY_DEFS[abilityId as AbilityId];
      if (!def || def.targeting === 'toggle') continue;
      if (state.charges < def.maxCharges && now >= state.nextChargeAt) {
        newCharges[abilityId as AbilityId] = {
          charges: state.charges + 1,
          nextChargeAt: now + def.cooldownPerCharge,
        };
        changed = true;
      }
    }
    if (!changed) return {};
    return { units: s.units.map(u => u.id === unitId ? { ...u, abilityCharges: newCharges } : u) };
  }),

  triggerAbility: (unitIds, abilityId, _target) => {
    const def = ABILITY_DEFS[abilityId];
    if (!def) return;
    const idSet = new Set(unitIds);

    set(state => {
      const now = state.combatElapsed;

      // Check that at least one unit has charges (skip for toggles)
      const casters = state.units.filter(u => idSet.has(u.id) && u.state !== 'dead');
      if (casters.length === 0) return {};

      if (def.targeting !== 'toggle') {
        const first = casters[0];
        const cs = first.abilityCharges?.[abilityId];
        const charges = cs?.charges ?? def.maxCharges;
        if (charges <= 0) return {};
      }

      const consumeCharge = (u: UnitData): UnitData['abilityCharges'] => {
        const prev = u.abilityCharges?.[abilityId];
        const charges = (prev?.charges ?? def.maxCharges) - 1;
        return {
          ...u.abilityCharges,
          [abilityId]: { charges: Math.max(0, charges), nextChargeAt: now + def.cooldownPerCharge },
        };
      };

      let units = state.units;
      let newBursts = state.bountyBursts;

      switch (abilityId) {
        case 'cavalry_charge':
          units = units.map(u => idSet.has(u.id) && u.state !== 'dead'
            ? { ...u, chargeBoost: true, abilityCharges: consumeCharge(u) } : u);
          break;

        case 'death_strike':
          units = units.map(u => idSet.has(u.id) && u.state !== 'dead'
            ? { ...u, chargeBoost: true, pendingBleed: true, abilityCharges: consumeCharge(u) } : u);
          break;

        case 'shield_bash':
          units = units.map(u => idSet.has(u.id) && u.state !== 'dead'
            ? { ...u, shieldBashing: true, abilityCharges: consumeCharge(u) } : u);
          break;

        case 'wind_step':
          units = units.map(u => idSet.has(u.id) && u.state !== 'dead'
            ? { ...u, speedBoostUntil: now + 5, abilityCharges: consumeCharge(u) } : u);
          break;

        case 'multi_shot':
          units = units.map(u => idSet.has(u.id) && u.state !== 'dead'
            ? { ...u, multiShotReady: true, abilityCharges: consumeCharge(u) } : u);
          break;

        case 'life_drain':
          // Toggle — no charge cost
          units = units.map(u => idSet.has(u.id) && u.state !== 'dead'
            ? { ...u, lifedrainAura: !u.lifedrainAura } : u);
          break;

        case 'phase_shift':
          units = units.map(u => idSet.has(u.id) && u.state !== 'dead'
            ? { ...u, phaseShift: true, phaseShiftUntil: now + 3, abilityCharges: consumeCharge(u) } : u);
          break;

        case 'natures_bounty': {
          // Instant AOE heal burst — heals all friendlies within 22 of each caster
          const batchedHeals = new Map<string, number>();
          for (const caster of casters) {
            for (const u of units) {
              if (u.state === 'dead' || u.teamId !== caster.teamId) continue;
              const dx = u.position[0] - caster.position[0];
              const dz = u.position[2] - caster.position[2];
              if (Math.sqrt(dx*dx + dz*dz) > 22) continue;
              batchedHeals.set(u.id, (batchedHeals.get(u.id) ?? 0) + 350);
            }
          }
          units = units.map(u => {
            const heal = batchedHeals.get(u.id);
            const wasCharge = idSet.has(u.id);
            return { ...u,
              health: heal ? Math.min(u.maxHealth, u.health + heal) : u.health,
              abilityCharges: wasCharge ? consumeCharge(u) : u.abilityCharges,
            };
          });
          // Add burst VFX for each caster
          for (const caster of casters) {
            newBursts = [...newBursts, {
              id: `burst_${Date.now()}_${caster.id}`,
              position: caster.position,
              radius: 22,
              createdAt: Date.now(),
            }];
          }
          break;
        }

        case 'holy_totem':
          // ground-targeting: handled by placeTotem after pendingAbility ground click
          break;
      }

      return { units, bountyBursts: newBursts, pendingAbility: null };
    });
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

    // Spawn commander hero unit if one was chosen
    const { playerCommander } = get();
    const cmdDef = playerCommander ? COMMANDER_BY_ID[playerCommander] : null;
    const cmdUnit: UnitData[] = cmdDef ? [{
      id: uid(),
      race: selectedRace,
      type: 'swordsmen',
      position: [0, 0, 18],
      health: cmdDef.hp,
      maxHealth: cmdDef.hp,
      state: 'idle' as UnitState,
      teamId: 1,
      maxSoldiers: 1,
      formationRows: 1,
      formationCols: 1,
      formationFacing: Math.PI,
      spacing: 1.0,
      isCommander: true,
      commanderArchetype: cmdDef.id,
      commanderName: cmdDef.name,
    }] : [];

    // Spawn a random enemy commander for the AI
    const enemyCommanders = getCommandersForRace(enemyRace);
    const enemyCmdDef = enemyCommanders[Math.floor(Math.random() * enemyCommanders.length)] ?? null;
    const enemyCmdUnit: UnitData[] = enemyCmdDef ? [{
      id: uid(),
      race: enemyRace,
      type: 'swordsmen',
      position: [0, 0, -18],
      health: Math.round(enemyCmdDef.hp * diffMult),
      maxHealth: Math.round(enemyCmdDef.hp * diffMult),
      state: 'idle' as UnitState,
      teamId: 2,
      maxSoldiers: 1,
      formationRows: 1,
      formationCols: 1,
      formationFacing: 0,
      spacing: 1.0,
      isCommander: true,
      commanderArchetype: enemyCmdDef.id,
      commanderName: enemyCmdDef.name,
    }] : [];

    set({
      units: [...team1, ...cmdUnit, ...team2, ...enemyCmdUnit],
      phase: 'battle',
      teamScores: { team1: 0, team2: 0 },
      enemyArmy: eArmy,
      combatElapsed: 0,
      totems: [],
      bountyBursts: [],
      pendingAbility: null,
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
    playerCommander: null,
    mapType: 'battlefield',
  }),
}));
