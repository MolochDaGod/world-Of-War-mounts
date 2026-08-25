import { BUILD_CATALOG_MAP } from '../building/BuildCatalog.ts';
import { WarZoneNature } from './WarZoneManifest.ts';

export type WarZoneObstacleKind = 'forest' | 'stone' | 'ruin' | 'building';

export interface WarZoneObstacle {
  id: string;
  kind: WarZoneObstacleKind;
  position: [number, number, number];
  rotation: number;
  scale: number;
  footprint: [number, number];
  modelPath?: string;
  pieceId?: string;
  health: number;
  maxHealth: number;
  blocksSight: boolean;
  blocksMovement: boolean;
  destroyed: boolean;
}

function natural(
  id: string,
  kind: 'forest' | 'stone' | 'ruin',
  x: number,
  z: number,
  modelPath: string,
  scale: number,
  radius: number,
  health: number,
  rotation = 0,
): WarZoneObstacle {
  return {
    id,
    kind,
    position: [x, 0, z],
    rotation,
    scale,
    footprint: [radius, radius],
    modelPath,
    health,
    maxHealth: health,
    blocksSight: true,
    blocksMovement: true,
    destroyed: false,
  };
}

function structure(
  id: string,
  pieceId: string,
  x: number,
  z: number,
  footprint: [number, number],
  health: number,
  rotation = 0,
): WarZoneObstacle {
  if (!BUILD_CATALOG_MAP[pieceId]) {
    throw new Error(`Unknown War Zone structure piece: ${pieceId}`);
  }
  return {
    id,
    kind: 'building',
    position: [x, 0, z],
    rotation,
    scale: 1,
    footprint,
    pieceId,
    health,
    maxHealth: health,
    blocksSight: true,
    blocksMovement: true,
    destroyed: false,
  };
}

/**
 * Static layout intentionally leaves a broad cross-shaped deployment area
 * open around the origin and around the original ±20/±48 army positions.
 * The outer clusters create lanes rather than a solid wall around the map.
 */
export const WAR_ZONE_OBSTACLE_SEED: WarZoneObstacle[] = [
  // Western forest belt
  natural('forest-west-north-1', 'forest', -112, -96, WarZoneNature.pine, 4.2, 5.5, 760, 0.2),
  natural('forest-west-north-2', 'forest', -94, -112, WarZoneNature.tree, 3.8, 5, 700, 1.4),
  natural('forest-west-north-3', 'forest', -74, -105, WarZoneNature.twistedTree, 3.5, 4.6, 680, 2.2),
  natural('forest-west-south-1', 'forest', -120, 88, WarZoneNature.pine, 4.4, 5.5, 760, 2.8),
  natural('forest-west-south-2', 'forest', -98, 108, WarZoneNature.ultimatePines, 1.9, 5.5, 820, 0.7),
  natural('forest-west-south-3', 'forest', -78, 94, WarZoneNature.deadTree, 3.2, 4.2, 520, 1.8),
  // Eastern forest belt
  natural('forest-east-north-1', 'forest', 88, -110, WarZoneNature.tree, 4.1, 5.2, 720, 3.4),
  natural('forest-east-north-2', 'forest', 112, -92, WarZoneNature.pine, 4.5, 5.6, 780, 1.1),
  natural('forest-east-north-3', 'forest', 126, -72, WarZoneNature.twistedTree, 3.3, 4.5, 670, 2.6),
  natural('forest-east-south-1', 'forest', 78, 108, WarZoneNature.pine, 4.0, 5.1, 740, 0.9),
  natural('forest-east-south-2', 'forest', 102, 116, WarZoneNature.ultimatePines, 1.8, 5.4, 800, 2.1),
  natural('forest-east-south-3', 'forest', 124, 94, WarZoneNature.deadTree, 3.1, 4.3, 510, 4.2),
  // Smaller brush pockets make the central lanes feel organic
  natural('brush-north-west', 'forest', -58, -92, WarZoneNature.bush, 2.6, 3.2, 260, 0.4),
  natural('brush-north-east', 'forest', 62, -90, WarZoneNature.bush, 2.4, 3.1, 250, 2.8),
  natural('brush-south-west', 'forest', -62, 92, WarZoneNature.fern, 2.4, 2.8, 220, 1.3),
  natural('brush-south-east', 'forest', 58, 94, WarZoneNature.bush, 2.7, 3.2, 260, 3.6),

  // Stone chokepoints and broken rock lines
  natural('stone-line-north-west', 'stone', -62, -68, WarZoneNature.roundPathRock, 1.7, 5.5, 980, 0.12),
  natural('stone-line-north-east', 'stone', 62, -68, WarZoneNature.squarePathRock, 1.7, 5.5, 980, -0.18),
  natural('stone-line-south-west', 'stone', -62, 68, WarZoneNature.squarePathRock, 1.65, 5.5, 980, 0.18),
  natural('stone-line-south-east', 'stone', 62, 68, WarZoneNature.roundPathRock, 1.7, 5.5, 980, -0.12),
  natural('stone-west-mid', 'stone', -100, 0, WarZoneNature.ultimateRocks, 1.25, 6.5, 1100, 0.9),
  natural('stone-east-mid', 'stone', 100, 0, WarZoneNature.rock, 2.1, 5.5, 900, 2.7),
  natural('stone-north-mid', 'stone', 0, -104, WarZoneNature.rock, 2.0, 5.5, 900, 1.6),
  natural('stone-south-mid', 'stone', 0, 104, WarZoneNature.ultimateRocks, 1.2, 6.5, 1100, 4.1),

  // Neutral structures create readable tactical objectives on the four approaches.
  structure('ruin-west', 'column_wide', -108, -8, [5, 5], 1200, 0),
  structure('ruin-east', 'column_wide', 108, 8, [5, 5], 1200, Math.PI),
  structure('tower-north', 'castle_rampart', 0, -126, [7, 4], 1500, 0),
  structure('tower-south', 'castle_rampart', 0, 126, [7, 4], 1500, Math.PI),
  structure('gate-north-west', 'wall_stone', -34, -116, [4, 4], 900, 0),
  structure('gate-north-east', 'wall_stone', 34, -116, [4, 4], 900, 0),
  structure('gate-south-west', 'wall_stone', -34, 116, [4, 4], 900, Math.PI),
  structure('gate-south-east', 'wall_stone', 34, 116, [4, 4], 900, Math.PI),
];

export function createWarZoneObstacles(): WarZoneObstacle[] {
  return WAR_ZONE_OBSTACLE_SEED.map((obstacle) => ({
    ...obstacle,
    position: [...obstacle.position] as [number, number, number],
    footprint: [...obstacle.footprint] as [number, number],
    destroyed: false,
    health: obstacle.maxHealth,
  }));
}