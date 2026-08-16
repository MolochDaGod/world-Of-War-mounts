import { AnimeWater } from './AnimeWater';
import { GrassField } from './GrassField';
import { Terrain } from './Terrain';

/**
 * World — composes all environmental elements.
 *
 * Render order:
 *  1. Terrain  — height-mapped ground + instanced trees/rocks + Rapier physics body
 *  2. GrassField — 18k instanced blades with wind shader (sits on top of terrain)
 *  3. AnimeWater — Voronoi cel-water at the edges, follows camera for "infinite" look
 */
export function World() {
  return (
    <group>
      <Terrain />
      <GrassField />
      <AnimeWater />
    </group>
  );
}
