/**
 * KenneyManifest — verified paths for all Kenney asset packs.
 * All paths resolve relative to public/ (served as static files).
 *
 * Packs included:
 *  - building-kit      → /assets/kenney/building/
 *  - prototype-kit     → /assets/kenney/prototype/
 *  - survival-kit      → /assets/kenney/survival/
 *  - nature-kit        → /assets/kenney/nature/
 *  - retro-textures-fantasy → /assets/kenney/textures/
 *  - ui-pack-rpg-expansion  → /assets/kenney/ui/
 */

const B  = '/assets/kenney/building';
const PR = '/assets/kenney/prototype';
const SV = '/assets/kenney/survival';
const NT = '/assets/kenney/nature';
const TX = '/assets/kenney/textures';
const UI = '/assets/kenney/ui';

// ── Building-kit GLBs ─────────────────────────────────────────────────────────
export const BuildingKit = {
  // Walls
  wall:              `${B}/wall.glb`,
  wallHalf:          `${B}/wall-half.glb`,
  wallLow:           `${B}/wall-low.glb`,
  wallCorner:        `${B}/wall-corner.glb`,
  wallCornerDiag:    `${B}/wall-corner-diagonal.glb`,
  wallCornerRound:   `${B}/wall-corner-round.glb`,
  wallDoorwaySquare: `${B}/wall-doorway-square.glb`,
  wallDoorwayRound:  `${B}/wall-doorway-round.glb`,
  wallDoorwayWide:   `${B}/wall-doorway-wide-square.glb`,
  wallWindowSquare:  `${B}/wall-window-square.glb`,
  wallWindowRound:   `${B}/wall-window-round.glb`,
  wallWindowWide:    `${B}/wall-window-wide-square.glb`,
  // Floors
  floor:             `${B}/floor.glb`,
  floorHalf:         `${B}/floor-half.glb`,
  floorQuarter:      `${B}/floor-quarter.glb`,
  floorCornerRound:  `${B}/floor-corner-round.glb`,
  // Roofs
  roofFlatCenter:    `${B}/roof-flat-center.glb`,
  roofFlatSide:      `${B}/roof-flat-side.glb`,
  roofFlatCorner:    `${B}/roof-flat-corner.glb`,
  roofFlatSquare:    `${B}/roof-flat-square.glb`,
  // Stairs
  stairsOpen:        `${B}/stairs-open.glb`,
  stairsClosed:      `${B}/stairs-closed.glb`,
  stairsCenter:      `${B}/stairs-center.glb`,
  stairsSides:       `${B}/stairs-sides.glb`,
  stairsOpenShort:   `${B}/stairs-open-short.glb`,
  // Columns / borders
  column:            `${B}/column.glb`,
  columnThin:        `${B}/column-thin.glb`,
  columnWide:        `${B}/column-wide.glb`,
  borderHigh:        `${B}/border-high.glb`,
  borderHighCorner:  `${B}/border-high-corner.glb`,
  border:            `${B}/border.glb`,
  borderCorner:      `${B}/border-corner.glb`,
  // Barricades
  barricadeDoorA:    `${B}/barricade-doorway-a.glb`,
  barricadeWindowA:  `${B}/barricade-window-a.glb`,
} as const;

// ── Prototype-kit GLBs ────────────────────────────────────────────────────────
export const PrototypeKit = {
  wall:              `${PR}/wall.glb`,
  wallLow:           `${PR}/wall-low.glb`,
  wallCorner:        `${PR}/wall-corner.glb`,
  wallDoorway:       `${PR}/wall-doorway.glb`,
  wallDoorwayRound:  `${PR}/wall-doorway-round.glb`,
  wallWindowMed:     `${PR}/wall-window-medium.glb`,
  floorSquare:       `${PR}/floor-square.glb`,
  floorThick:        `${PR}/floor-thick.glb`,
  stairs:            `${PR}/stairs.glb`,
  stairsSmall:       `${PR}/stairs-small.glb`,
  column:            `${PR}/column.glb`,
  crate:             `${PR}/crate.glb`,
  flag:              `${PR}/flag.glb`,
} as const;

// ── Survival-kit GLBs ─────────────────────────────────────────────────────────
export const SurvivalKit = {
  fence:             `${SV}/fence.glb`,
  fenceFortified:    `${SV}/fence-fortified.glb`,
  fenceDoorway:      `${SV}/fence-doorway.glb`,
  structure:         `${SV}/structure.glb`,
  structureFloor:    `${SV}/structure-floor.glb`,
  structureRoof:     `${SV}/structure-roof.glb`,
  structureMetal:    `${SV}/structure-metal.glb`,
  tent:              `${SV}/tent.glb`,
  tentCanvas:        `${SV}/tent-canvas.glb`,
  workbench:         `${SV}/workbench.glb`,
  workbenchAnvil:    `${SV}/workbench-anvil.glb`,
  campfirePit:       `${SV}/campfire-pit.glb`,
  campfireStand:     `${SV}/campfire-stand.glb`,
  chest:             `${SV}/chest.glb`,
  barrel:            `${SV}/barrel.glb`,
  toolAxe:           `${SV}/tool-axe.glb`,
  toolPickaxe:       `${SV}/tool-pickaxe.glb`,
  toolHammer:        `${SV}/tool-hammer.glb`,
  resourceWood:      `${SV}/resource-wood.glb`,
  resourceStone:     `${SV}/resource-stone.glb`,
} as const;

// ── Nature-kit GLBs ───────────────────────────────────────────────────────────
export const NatureKit = {
  campfireStones:    `${NT}/campfire_stones.glb`,
  campfireLogs:      `${NT}/campfire_logs.glb`,
  campfirePlanks:    `${NT}/campfire_planks.glb`,
  bridgeStone:       `${NT}/bridge_stone.glb`,
  bridgeWood:        `${NT}/bridge_wood.glb`,
} as const;

// ── Retro-fantasy textures ────────────────────────────────────────────────────
export const RetroTex = {
  wallStone:         `${TX}/wall_stone.png`,
  wallStoneDepth:    `${TX}/wall_stone_depth.png`,
  wallTimber:        `${TX}/wall_timber.png`,
  wallTimberStruct:  `${TX}/wall_timber_structure.png`,
  floorStone:        `${TX}/floor_stone.png`,
  floorStonePattern: `${TX}/floor_stone_pattern.png`,
  floorWoodPlanks:   `${TX}/floor_wood_planks.png`,
  floorGroundDirt:   `${TX}/floor_ground_dirt.png`,
  floorGroundGrass:  `${TX}/floor_ground_grass.png`,
  floorTilesTan:     `${TX}/floor_tiles_tan_large.png`,
  roofClayRed:       `${TX}/roof_clay_red_center.png`,
  roofThatch:        `${TX}/roof_thatch_center.png`,
} as const;

// ── RPG UI sprites ────────────────────────────────────────────────────────────
export const KenneyUI = {
  panelBeige:        `${UI}/panel_beige.png`,
  panelBrown:        `${UI}/panel_brown.png`,
  panelBlue:         `${UI}/panel_blue.png`,
  btnBeige:          `${UI}/buttonSquare_beige.png`,
  btnBlue:           `${UI}/buttonSquare_blue.png`,
  btnBrown:          `${UI}/buttonSquare_brown.png`,
  btnBeigePressed:   `${UI}/buttonSquare_beige_pressed.png`,
  btnBluePressed:    `${UI}/buttonSquare_blue_pressed.png`,
  iconCheck:         `${UI}/iconCheck_blue.png`,
  iconCross:         `${UI}/iconCross_beige.png`,
  cursorSword:       `${UI}/cursorSword_gold.png`,
} as const;
