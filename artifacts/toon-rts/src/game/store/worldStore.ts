/**
 * worldStore — open-world RTS/survival state.
 * Tracks resources, world entities (animals, resource nodes, items),
 * survival stats, and time-of-day.
 */
import { create } from 'zustand';

// ── Resource types ────────────────────────────────────────────────────────────
export interface Resources {
  wood:    number;
  gold:    number;
  crystal: number;
  coal:    number;
  food:    number;
}

// ── World entity types ────────────────────────────────────────────────────────
export type AnimalKind = 'bear' | 'wolf' | 'boar' | 'deer' | 'deer2' | 'fox' | 'rabbit' | 'owl';
export type AnimalBehavior = 'wander' | 'flee' | 'chase' | 'idle' | 'dead';

export interface AnimalEntity {
  id: string;
  kind: AnimalKind;
  position: [number, number, number];
  targetPosition: [number, number, number];
  health: number;
  maxHealth: number;
  behavior: AnimalBehavior;
  alertRadius: number;
  /** timestamp of last behaviour update */
  lastBehaviorAt: number;
}

export type ResourceKind = 'tree' | 'goldMine' | 'crystalMine' | 'coalMine';

export interface ResourceNode {
  id: string;
  kind: ResourceKind;
  position: [number, number, number];
  modelVariant: number; // index into model array
  amount: number;       // remaining resources
  maxAmount: number;
  depleted: boolean;
  /** worker unit id that is currently gathering (if any) */
  gathererUnitId?: string;
}

export type ItemKind = 'chest' | 'sword' | 'hammer' | 'cane';

export interface WorldItem {
  id: string;
  kind: ItemKind;
  position: [number, number, number];
  modelVariant: number;
  collected: boolean;
  /** loot contents */
  loot: Partial<Resources>;
}

// ── Unit upgrade levels ───────────────────────────────────────────────────────
export interface UnitUpgrade {
  attack:  number; // 0-3
  defense: number;
  speed:   number;
}

// ── Buildings / structures ────────────────────────────────────────────────────
/**
 * `kind` is now an open string to support both legacy preset kinds
 * ('barracks', 'mage_tower', etc.) and new modular Kenney pieces ('piece').
 * When `kind === 'piece'`, `pieceId` holds the BuildCatalog id.
 */
export interface Building {
  id: string;
  kind: string;
  /** BuildCatalog piece id — set when kind === 'piece'. */
  pieceId?: string;
  teamId: 1 | 2;
  position: [number, number, number];
  /** Rotation in 90° increments (0 = 0°, 1 = 90°, 2 = 180°, 3 = 270°). */
  rotation?: number;
  health: number;
  maxHealth: number;
  level: number;
}

// ── Batch animal tick update ──────────────────────────────────────────────────
/** All fields are optional; only provided ones are applied. */
export interface AnimalTickUpdate {
  id: string;
  position?:        [number, number, number];
  behavior?:        AnimalBehavior;
  targetPosition?:  [number, number, number];
  lastBehaviorAt?:  number;
}

// ── Survival / exploration state ──────────────────────────────────────────────
export interface WorldState {
  // Time
  timeOfDay: number;          // 0-24 hours; advances each second
  dayCount: number;

  // Player resources
  resources: Resources;

  // World entities
  animals: AnimalEntity[];
  resourceNodes: ResourceNode[];
  worldItems: WorldItem[];
  buildings: Building[];

  // Unit upgrades by type key
  upgrades: Record<string, UnitUpgrade>;

  // Fog of war / exploration
  exploredRadius: number;

  // ── Actions ──────────────────────────────────────────────────────────────────
  tickTime: (delta: number) => void;
  addResources: (r: Partial<Resources>) => void;
  spendResources: (r: Partial<Resources>) => boolean;
  gatherResource: (nodeId: string, amount: number) => void;
  collectItem: (itemId: string) => void;
  damageAnimal: (animalId: string, dmg: number) => void;
  setAnimalBehavior: (animalId: string, behavior: AnimalBehavior, target?: [number,number,number]) => void;
  moveAnimal: (animalId: string, pos: [number,number,number]) => void;
  /**
   * Apply position + behavior updates for many animals in one set() call.
   * Use this inside useFrame AI ticks to avoid N sequential synchronous
   * Zustand notifications (which cascade via useSyncExternalStore in v5).
   */
  batchUpdateAnimals: (updates: AnimalTickUpdate[]) => void;
  addBuilding: (b: Building) => void;
  removeBuilding: (buildingId: string) => void;
  damageBuilding: (buildingId: string, dmg: number) => void;
  upgradeUnit: (typeKey: string, stat: keyof UnitUpgrade) => void;
}

// ── Stable ID counter ─────────────────────────────────────────────────────────
let wid = 0;
export function wuid() { return `w_${++wid}`; }

// ── Pre-place resource nodes across the world ─────────────────────────────────
function seededHash(x: number, z: number) {
  let h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

function makeResourceNodes(): ResourceNode[] {
  const nodes: ResourceNode[] = [];
  const placements: [number,number, ResourceKind, number][] = [
    // [x, z, kind, variant]
    [-55, -40, 'goldMine', 0],  [-60, 30, 'goldMine', 1],
    [55, -35, 'crystalMine', 0], [50, 45, 'crystalMine', 1], [0, -70, 'crystalMine', 2],
    [-30, 70, 'coalMine', 0],  [70, 0, 'coalMine', 0],
    // Trees — scattered
    ...Array.from({ length: 20 }, (_, i): [number, number, ResourceKind, number] => {
      const angle = (i / 20) * Math.PI * 2;
      const r = 25 + seededHash(i * 3.7, 1.1) * 35;
      return [Math.cos(angle) * r, Math.sin(angle) * r, 'tree', i % 10];
    }),
  ];

  for (const [x, z, kind, variant] of placements) {
    const maxAmount = kind === 'tree' ? 50 : kind === 'goldMine' ? 200 : 150;
    nodes.push({
      id: wuid(), kind, position: [x, 0, z],
      modelVariant: variant, amount: maxAmount, maxAmount, depleted: false,
    });
  }
  return nodes;
}

// ── Pre-place world animals ───────────────────────────────────────────────────
function makeAnimals(): AnimalEntity[] {
  const specs: [AnimalKind, number, number, number, number][] = [
    // kind, x, z, hp, alertRadius
    ['bear',   -70, -60, 120, 18],
    ['bear',    65, -70, 120, 18],
    ['wolf',   -40, -55,  60, 22],
    ['wolf',    45, -50,  60, 22],
    ['wolf',     0,  80,  60, 22],
    ['boar',   -25,  45,  50, 14],
    ['boar',    30,  60,  50, 14],
    ['deer',   -60,  20,  35,  8],
    ['deer',    55,  15,  35,  8],
    ['deer2',   10, -80,  35,  8],
    ['fox',    -15,  50,  25,  6],
    ['fox',     25, -45,  25,  6],
    ['rabbit', -35, -30,  15,  4],
    ['rabbit',  40,  35,  15,  4],
    ['rabbit',  60,  60,  15,  4],
    ['owl',    -50,  70,  20, 12],
  ];

  return specs.map(([kind, x, z, hp, alertRadius]) => ({
    id: wuid(), kind,
    position: [x, 0, z] as [number,number,number],
    targetPosition: [x, 0, z] as [number,number,number],
    health: hp, maxHealth: hp,
    behavior: 'wander' as AnimalBehavior,
    alertRadius, lastBehaviorAt: 0,
  }));
}

// ── Pre-place world items ─────────────────────────────────────────────────────
function makeWorldItems(): WorldItem[] {
  const items: WorldItem[] = [];
  // Scattered chests
  const chestPositions: [number,number][] = [
    [-20, -50], [40, 20], [-55, 55], [65, -20], [0, 90],
    [-80, 0], [80, 0], [30, -80], [-30, 80],
  ];
  for (let i = 0; i < chestPositions.length; i++) {
    const [x, z] = chestPositions[i];
    items.push({
      id: wuid(), kind: 'chest',
      position: [x, 0, z],
      modelVariant: i % 5,
      collected: false,
      loot: { gold: 20 + Math.floor(seededHash(x, z) * 80), crystal: Math.floor(seededHash(z, x) * 40) },
    });
  }
  // Some dropped weapons
  const weaponPositions: [number,number,ItemKind][] = [
    [-45, 10, 'sword'], [15, -35, 'hammer'], [55, 35, 'cane'], [-70, -30, 'sword'],
  ];
  for (const [x, z, kind] of weaponPositions) {
    items.push({
      id: wuid(), kind,
      position: [x, 0, z],
      modelVariant: Math.floor(seededHash(x+1, z+1) * 5),
      collected: false,
      loot: { gold: 10, crystal: 5 },
    });
  }
  return items;
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const useWorldStore = create<WorldState>((set, get) => ({
  timeOfDay:     8.0,
  dayCount:      1,
  resources:     { wood: 50, gold: 100, crystal: 20, coal: 10, food: 30 },
  animals:       makeAnimals(),
  resourceNodes: makeResourceNodes(),
  worldItems:    makeWorldItems(),
  buildings:     [],
  upgrades:      {},
  exploredRadius: 40,

  tickTime: (delta) => set(s => {
    const tod = (s.timeOfDay + delta * (24 / 600)) % 24; // 10-min day cycle
    return { timeOfDay: tod, dayCount: tod < s.timeOfDay ? s.dayCount + 1 : s.dayCount };
  }),

  addResources: (r) => set(s => ({
    resources: {
      wood:    s.resources.wood    + (r.wood    ?? 0),
      gold:    s.resources.gold    + (r.gold    ?? 0),
      crystal: s.resources.crystal + (r.crystal ?? 0),
      coal:    s.resources.coal    + (r.coal    ?? 0),
      food:    s.resources.food    + (r.food    ?? 0),
    },
  })),

  spendResources: (r) => {
    const { resources } = get();
    const ok =
      (resources.wood    >= (r.wood    ?? 0)) &&
      (resources.gold    >= (r.gold    ?? 0)) &&
      (resources.crystal >= (r.crystal ?? 0)) &&
      (resources.coal    >= (r.coal    ?? 0)) &&
      (resources.food    >= (r.food    ?? 0));
    if (ok) set(s => ({
      resources: {
        wood:    s.resources.wood    - (r.wood    ?? 0),
        gold:    s.resources.gold    - (r.gold    ?? 0),
        crystal: s.resources.crystal - (r.crystal ?? 0),
        coal:    s.resources.coal    - (r.coal    ?? 0),
        food:    s.resources.food    - (r.food    ?? 0),
      },
    }));
    return ok;
  },

  gatherResource: (nodeId, amount) => set(s => {
    const nodes = s.resourceNodes.map(n => {
      if (n.id !== nodeId || n.depleted) return n;
      const newAmt = Math.max(0, n.amount - amount);
      return { ...n, amount: newAmt, depleted: newAmt === 0 };
    });
    const node = s.resourceNodes.find(n => n.id === nodeId);
    if (!node) return { resourceNodes: nodes };
    const gained: Partial<Resources> = {};
    if (node.kind === 'tree')        gained.wood    = amount;
    if (node.kind === 'goldMine')    gained.gold    = amount;
    if (node.kind === 'crystalMine') gained.crystal = amount;
    if (node.kind === 'coalMine')    gained.coal    = amount;
    const newRes = {
      ...s.resources,
      wood:    s.resources.wood    + (gained.wood    ?? 0),
      gold:    s.resources.gold    + (gained.gold    ?? 0),
      crystal: s.resources.crystal + (gained.crystal ?? 0),
      coal:    s.resources.coal    + (gained.coal    ?? 0),
    };
    return { resourceNodes: nodes, resources: newRes };
  }),

  collectItem: (itemId) => set(s => {
    const item = s.worldItems.find(i => i.id === itemId);
    if (!item || item.collected) return {};
    const newItems = s.worldItems.map(i => i.id === itemId ? { ...i, collected: true } : i);
    const newRes = {
      ...s.resources,
      gold:    s.resources.gold    + (item.loot.gold    ?? 0),
      crystal: s.resources.crystal + (item.loot.crystal ?? 0),
      wood:    s.resources.wood    + (item.loot.wood    ?? 0),
    };
    return { worldItems: newItems, resources: newRes };
  }),

  damageAnimal: (animalId, dmg) => set(s => ({
    animals: s.animals.map(a => {
      if (a.id !== animalId) return a;
      const hp = Math.max(0, a.health - dmg);
      return { ...a, health: hp, behavior: hp <= 0 ? 'dead' : a.behavior };
    }),
  })),

  setAnimalBehavior: (animalId, behavior, target) => set(s => ({
    animals: s.animals.map(a =>
      a.id !== animalId ? a : {
        ...a, behavior,
        targetPosition: target ?? a.targetPosition,
        lastBehaviorAt: Date.now(),
      },
    ),
  })),

  moveAnimal: (animalId, pos) => set(s => ({
    animals: s.animals.map(a => a.id !== animalId ? a : { ...a, position: pos }),
  })),

  batchUpdateAnimals: (updates) => {
    if (updates.length === 0) return;
    // Build id→update map for O(n) lookup
    const map = new Map<string, AnimalTickUpdate>();
    for (const u of updates) map.set(u.id, u);
    set(s => ({
      animals: s.animals.map(a => {
        const u = map.get(a.id);
        if (!u) return a;
        return {
          ...a,
          ...(u.position       !== undefined ? { position:       u.position       } : {}),
          ...(u.behavior       !== undefined ? { behavior:       u.behavior       } : {}),
          ...(u.targetPosition !== undefined ? { targetPosition: u.targetPosition } : {}),
          ...(u.lastBehaviorAt !== undefined ? { lastBehaviorAt: u.lastBehaviorAt } : {}),
        };
      }),
    }));
  },

  addBuilding:    (b)               => set(s => ({ buildings: [...s.buildings, b] })),
  removeBuilding: (buildingId)      => set(s => ({ buildings: s.buildings.filter(b => b.id !== buildingId) })),

  damageBuilding: (buildingId, dmg) => set(s => ({
    buildings: s.buildings.map(b =>
      b.id !== buildingId ? b : { ...b, health: Math.max(0, b.health - dmg) },
    ),
  })),

  upgradeUnit: (typeKey, stat) => set(s => {
    const current = s.upgrades[typeKey] ?? { attack: 0, defense: 0, speed: 0 };
    if (current[stat] >= 3) return {};
    return {
      upgrades: { ...s.upgrades, [typeKey]: { ...current, [stat]: current[stat] + 1 } },
    };
  }),
}));
