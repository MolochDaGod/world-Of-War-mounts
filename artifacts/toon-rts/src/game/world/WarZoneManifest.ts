/**
 * WarZoneManifest — the deliberately small subset of the two attached nature
 * packs used by the expanded arena. Keeping this list explicit makes the
 * preparation gate authoritative without forcing the browser to download
 * every duplicate variant in either pack.
 */
import { BUILD_CATALOG_MAP } from '@/game/building/BuildCatalog';

const ROOT = '/assets/nature-warzone';

export const WarZoneNature = {
  tree: `${ROOT}/mega/tree.glb`,
  pine: `${ROOT}/mega/pine.glb`,
  twistedTree: `${ROOT}/mega/twisted-tree.glb`,
  deadTree: `${ROOT}/mega/dead-tree.glb`,
  bush: `${ROOT}/mega/bush.glb`,
  fern: `${ROOT}/mega/fern.glb`,
  rock: `${ROOT}/mega/rock-medium.glb`,
  roundPathRock: `${ROOT}/mega/rock-path-round-wide.glb`,
  squarePathRock: `${ROOT}/mega/rock-path-square-wide.glb`,
  tallGrass: `${ROOT}/mega/tall-grass.glb`,
  ultimatePines: `${ROOT}/ultimate/pine-trees.glb`,
  ultimateRocks: `${ROOT}/ultimate/rocks.glb`,
} as const;

export const WAR_ZONE_NATURE_ASSETS = Object.values(WarZoneNature);

export const WAR_ZONE_STRUCTURE_PIECE_IDS = [
  'column_wide',
  'castle_rampart',
  'wall_stone',
] as const;

export const WAR_ZONE_STRUCTURE_ASSETS = WAR_ZONE_STRUCTURE_PIECE_IDS.flatMap((id) => {
  const piece = BUILD_CATALOG_MAP[id];
  return piece ? [piece.glbPath, ...(piece.texture ? [piece.texture] : [])] : [];
});

export const WAR_ZONE_REQUIRED_ASSETS = [
  ...WAR_ZONE_NATURE_ASSETS,
  ...WAR_ZONE_STRUCTURE_ASSETS,
];