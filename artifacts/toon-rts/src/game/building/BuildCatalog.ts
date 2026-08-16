/**
 * BuildCatalog — curated catalog of all placeable building pieces.
 *
 * Each entry maps a stable ID to its GLB path, retro-fantasy texture,
 * display metadata, grid snap, scale, and resource cost.
 *
 * Pieces without `texture` use the GLB's native embedded materials
 * (survival-kit and nature-kit pieces look best with their own colors).
 */
import type { Resources } from '@/game/store/worldStore';
import { BuildingKit, SurvivalKit, NatureKit, RetroTex } from './KenneyManifest';

export type BuildTab = 'fortifications' | 'buildings' | 'camp' | 'nature';

export interface BuildPiece {
  id:        string;
  label:     string;
  tab:       BuildTab;
  icon:      string;
  /** Path to GLB model. */
  glbPath:   string;
  /**
   * Retro-fantasy texture to apply to ALL meshes in the GLB.
   * If undefined, the GLB's native embedded materials are used.
   */
  texture?:  string;
  /** Uniform scale applied to the loaded GLB. Kenney tiles are 2m; scale 3 → 6 game units. */
  scale:     number;
  /** Extra Y offset so piece sits flush on the ground plane. */
  yOffset:   number;
  /** Grid snap in game units. All pieces snap to a 2-unit grid. */
  snapSize:  number;
  /** Resource cost to place one piece. */
  cost:      Partial<Resources>;
  /** Max HP for the placed building. */
  health:    number;
}

// ── Fortifications ────────────────────────────────────────────────────────────
// Building-kit modular walls + castle ramparts, skinned with retro stone texture.
const fortifications: BuildPiece[] = [
  {
    id: 'wall_stone',        label: 'Stone Wall',
    tab: 'fortifications',   icon: '🧱',
    glbPath: BuildingKit.wall,
    texture: RetroTex.wallStone,
    scale: 3, yOffset: 0, snapSize: 2,
    cost: { wood: 10, crystal: 5 }, health: 120,
  },
  {
    id: 'wall_stone_corner', label: 'Wall Corner',
    tab: 'fortifications',   icon: '🔲',
    glbPath: BuildingKit.wallCorner,
    texture: RetroTex.wallStone,
    scale: 3, yOffset: 0, snapSize: 2,
    cost: { wood: 10, crystal: 5 }, health: 120,
  },
  {
    id: 'wall_stone_door',   label: 'Stone Doorway',
    tab: 'fortifications',   icon: '🚪',
    glbPath: BuildingKit.wallDoorwaySquare,
    texture: RetroTex.wallStone,
    scale: 3, yOffset: 0, snapSize: 2,
    cost: { wood: 8 }, health: 80,
  },
  {
    id: 'wall_stone_window', label: 'Window Wall',
    tab: 'fortifications',   icon: '🪟',
    glbPath: BuildingKit.wallWindowSquare,
    texture: RetroTex.wallStone,
    scale: 3, yOffset: 0, snapSize: 2,
    cost: { wood: 8 }, health: 80,
  },
  {
    id: 'wall_stone_low',    label: 'Low Wall',
    tab: 'fortifications',   icon: '▬',
    glbPath: BuildingKit.wallLow,
    texture: RetroTex.wallStone,
    scale: 3, yOffset: 0, snapSize: 2,
    cost: { wood: 6 }, health: 60,
  },
  {
    id: 'castle_rampart',    label: 'Castle Rampart',
    tab: 'fortifications',   icon: '🏰',
    glbPath: BuildingKit.borderHigh,
    texture: RetroTex.wallStoneDepth,
    scale: 3, yOffset: 0, snapSize: 2,
    cost: { wood: 15, crystal: 10 }, health: 200,
  },
  {
    id: 'castle_corner',     label: 'Rampart Corner',
    tab: 'fortifications',   icon: '🗼',
    glbPath: BuildingKit.borderHighCorner,
    texture: RetroTex.wallStoneDepth,
    scale: 3, yOffset: 0, snapSize: 2,
    cost: { wood: 15, crystal: 10 }, health: 200,
  },
  {
    id: 'wall_timber',       label: 'Timber Wall',
    tab: 'fortifications',   icon: '🪵',
    glbPath: BuildingKit.wall,
    texture: RetroTex.wallTimberStruct,
    scale: 3, yOffset: 0, snapSize: 2,
    cost: { wood: 15 }, health: 80,
  },
  {
    id: 'barricade_door',    label: 'Barricade Door',
    tab: 'fortifications',   icon: '🔒',
    glbPath: BuildingKit.barricadeDoorA,
    texture: RetroTex.wallTimber,
    scale: 3, yOffset: 0, snapSize: 2,
    cost: { wood: 12 }, health: 60,
  },
];

// ── Buildings ─────────────────────────────────────────────────────────────────
// Floors, roofs, stairs, columns — modular interior/exterior construction.
const buildings: BuildPiece[] = [
  {
    id: 'floor_stone',       label: 'Stone Floor',
    tab: 'buildings',        icon: '⬜',
    glbPath: BuildingKit.floor,
    texture: RetroTex.floorStone,
    scale: 3, yOffset: 0, snapSize: 2,
    cost: { wood: 5, crystal: 3 }, health: 100,
  },
  {
    id: 'floor_wood',        label: 'Wood Floor',
    tab: 'buildings',        icon: '🟫',
    glbPath: BuildingKit.floor,
    texture: RetroTex.floorWoodPlanks,
    scale: 3, yOffset: 0, snapSize: 2,
    cost: { wood: 8 }, health: 60,
  },
  {
    id: 'floor_tile',        label: 'Tile Floor',
    tab: 'buildings',        icon: '🔳',
    glbPath: BuildingKit.floor,
    texture: RetroTex.floorTilesTan,
    scale: 3, yOffset: 0, snapSize: 2,
    cost: { wood: 6, crystal: 2 }, health: 80,
  },
  {
    id: 'roof_flat',         label: 'Flat Roof',
    tab: 'buildings',        icon: '🏠',
    glbPath: BuildingKit.roofFlatCenter,
    texture: RetroTex.roofClayRed,
    scale: 3, yOffset: 0, snapSize: 2,
    cost: { wood: 12 }, health: 60,
  },
  {
    id: 'roof_flat_corner',  label: 'Roof Corner',
    tab: 'buildings',        icon: '🏚',
    glbPath: BuildingKit.roofFlatCorner,
    texture: RetroTex.roofThatch,
    scale: 3, yOffset: 0, snapSize: 2,
    cost: { wood: 10 }, health: 60,
  },
  {
    id: 'stairs_stone',      label: 'Stone Stairs',
    tab: 'buildings',        icon: '🪜',
    glbPath: BuildingKit.stairsOpen,
    texture: RetroTex.floorStonePattern,
    scale: 3, yOffset: 0, snapSize: 2,
    cost: { wood: 12, crystal: 5 }, health: 100,
  },
  {
    id: 'column_stone',      label: 'Stone Column',
    tab: 'buildings',        icon: '🏛',
    glbPath: BuildingKit.column,
    texture: RetroTex.wallStone,
    scale: 3, yOffset: 0, snapSize: 2,
    cost: { wood: 10, crystal: 5 }, health: 150,
  },
  {
    id: 'column_wide',       label: 'Wide Column',
    tab: 'buildings',        icon: '🗿',
    glbPath: BuildingKit.columnWide,
    texture: RetroTex.wallStoneDepth,
    scale: 3, yOffset: 0, snapSize: 2,
    cost: { wood: 15, crystal: 8 }, health: 200,
  },
];

// ── Camp ──────────────────────────────────────────────────────────────────────
// Survival-kit structures with native materials — tents, workbenches, fences.
const camp: BuildPiece[] = [
  {
    id: 'fence_wood',        label: 'Wood Fence',
    tab: 'camp',             icon: '🌿',
    glbPath: SurvivalKit.fence,
    scale: 2, yOffset: 0, snapSize: 2,
    cost: { wood: 5 }, health: 30,
  },
  {
    id: 'fence_fortified',   label: 'Fortified Fence',
    tab: 'camp',             icon: '⚔️',
    glbPath: SurvivalKit.fenceFortified,
    scale: 2, yOffset: 0, snapSize: 2,
    cost: { wood: 10 }, health: 60,
  },
  {
    id: 'fence_gate',        label: 'Fence Gate',
    tab: 'camp',             icon: '🚧',
    glbPath: SurvivalKit.fenceDoorway,
    scale: 2, yOffset: 0, snapSize: 2,
    cost: { wood: 8 }, health: 40,
  },
  {
    id: 'tent',              label: 'Tent',
    tab: 'camp',             icon: '⛺',
    glbPath: SurvivalKit.tent,
    scale: 2, yOffset: 0, snapSize: 2,
    cost: { wood: 20 }, health: 50,
  },
  {
    id: 'tent_canvas',       label: 'Canvas Tent',
    tab: 'camp',             icon: '🏕',
    glbPath: SurvivalKit.tentCanvas,
    scale: 2, yOffset: 0, snapSize: 2,
    cost: { wood: 25 }, health: 60,
  },
  {
    id: 'structure',         label: 'Shelter',
    tab: 'camp',             icon: '🏗',
    glbPath: SurvivalKit.structure,
    scale: 2, yOffset: 0, snapSize: 2,
    cost: { wood: 30 }, health: 80,
  },
  {
    id: 'workbench',         label: 'Workbench',
    tab: 'camp',             icon: '🔨',
    glbPath: SurvivalKit.workbench,
    scale: 2, yOffset: 0, snapSize: 2,
    cost: { wood: 15 }, health: 40,
  },
  {
    id: 'workbench_anvil',   label: 'Anvil',
    tab: 'camp',             icon: '⚒️',
    glbPath: SurvivalKit.workbenchAnvil,
    scale: 2, yOffset: 0, snapSize: 2,
    cost: { wood: 10, gold: 20 }, health: 60,
  },
  {
    id: 'campfire',          label: 'Campfire',
    tab: 'camp',             icon: '🔥',
    glbPath: SurvivalKit.campfirePit,
    scale: 2, yOffset: 0, snapSize: 2,
    cost: { wood: 5 }, health: 20,
  },
  {
    id: 'campfire_stand',    label: 'Fire Stand',
    tab: 'camp',             icon: '🕯️',
    glbPath: SurvivalKit.campfireStand,
    scale: 2, yOffset: 0, snapSize: 2,
    cost: { wood: 8 }, health: 20,
  },
  {
    id: 'chest',             label: 'Chest',
    tab: 'camp',             icon: '📦',
    glbPath: SurvivalKit.chest,
    scale: 1.5, yOffset: 0, snapSize: 2,
    cost: { wood: 12, gold: 10 }, health: 40,
  },
  {
    id: 'barrel',            label: 'Barrel',
    tab: 'camp',             icon: '🛢️',
    glbPath: SurvivalKit.barrel,
    scale: 1.5, yOffset: 0, snapSize: 2,
    cost: { wood: 6 }, health: 20,
  },
];

// ── Nature decorations ────────────────────────────────────────────────────────
// Nature-kit campfires and bridges with their native materials.
const nature: BuildPiece[] = [
  {
    id: 'campfire_stones',   label: 'Stone Fire Ring',
    tab: 'nature',           icon: '🪨',
    glbPath: NatureKit.campfireStones,
    scale: 2, yOffset: 0, snapSize: 2,
    cost: { wood: 5 }, health: 10,
  },
  {
    id: 'campfire_logs',     label: 'Log Fire',
    tab: 'nature',           icon: '🪵',
    glbPath: NatureKit.campfireLogs,
    scale: 2, yOffset: 0, snapSize: 2,
    cost: { wood: 8 }, health: 10,
  },
  {
    id: 'campfire_planks',   label: 'Plank Fire',
    tab: 'nature',           icon: '🔥',
    glbPath: NatureKit.campfirePlanks,
    scale: 2, yOffset: 0, snapSize: 2,
    cost: { wood: 8 }, health: 10,
  },
  {
    id: 'bridge_stone',      label: 'Stone Bridge',
    tab: 'nature',           icon: '🌉',
    glbPath: NatureKit.bridgeStone,
    scale: 2, yOffset: 0, snapSize: 2,
    cost: { wood: 30, crystal: 15 }, health: 200,
  },
  {
    id: 'bridge_wood',       label: 'Wood Bridge',
    tab: 'nature',           icon: '🌁',
    glbPath: NatureKit.bridgeWood,
    scale: 2, yOffset: 0, snapSize: 2,
    cost: { wood: 25 }, health: 100,
  },
];

// ── Full catalog ──────────────────────────────────────────────────────────────
export const BUILD_CATALOG: BuildPiece[] = [
  ...fortifications,
  ...buildings,
  ...camp,
  ...nature,
];

/** Lookup by piece id — O(1) access. */
export const BUILD_CATALOG_MAP: Record<string, BuildPiece> = Object.fromEntries(
  BUILD_CATALOG.map((p) => [p.id, p]),
);

export const BUILD_TABS: { id: BuildTab; label: string; icon: string }[] = [
  { id: 'fortifications', label: 'Fortify',    icon: '🏰' },
  { id: 'buildings',      label: 'Build',      icon: '🏗' },
  { id: 'camp',           label: 'Camp',       icon: '⛺' },
  { id: 'nature',         label: 'Nature',     icon: '🌿' },
];
