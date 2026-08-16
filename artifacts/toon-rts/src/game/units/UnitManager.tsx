/**
 * UnitManager — renders one FBXUnit (or BaseUnit fallback) per living game unit.
 *
 * Subscribes to a STABLE metadata string that only changes when units are spawned
 * or permanently removed from the store. CombatSystem writes positions/health at
 * ~30Hz but those writes do NOT change the metadata string, so UnitManager does
 * NOT re-render on every combat tick.
 *
 * Each FBXUnit/BaseUnit subscribes to its OWN unit slice internally, so position
 * and health updates only re-render the one affected component.
 */
import { Suspense, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { BaseUnit } from './BaseUnit';
import { FBXUnit } from '../assets/FBXUnit';
import { AssetManifest } from '../assets/AssetManifest';
import * as THREE from 'three';

// Team color constants (shared, stable refs)
const TEAM_COLORS: Record<number, THREE.Color> = {
  1: new THREE.Color('#2a6fb3'),
  2: new THREE.Color('#b3392a'),
};

export function UnitManager() {
  // Stable metadata string — race/type/teamId are set on spawn and never change.
  // This selector only produces a new string when units are added or removed.
  // 30Hz position/health writes do NOT change this string → no re-render cascade.
  const unitMetaStr = useGameStore(
    s => s.units.map(u => `${u.id}|${u.race}|${u.type}|${u.teamId}`).join(',')
  );

  const unitMetas = useMemo(() => {
    if (!unitMetaStr) return [];
    return unitMetaStr.split(',').map(seg => {
      const [id, race, type, teamId] = seg.split('|');
      return { id, race, type, teamId: Number(teamId) };
    });
  }, [unitMetaStr]);

  return (
    <group>
      {unitMetas.map(({ id, race, type, teamId }) => {
        const manifest  = AssetManifest[race as keyof typeof AssetManifest];
        const teamColor = TEAM_COLORS[teamId] ?? new THREE.Color('#fff');

        if (!manifest) {
          return <BaseUnit key={id} unitId={id} />;
        }

        // Decide which FBX path to use for this unit type (static — never changes)
        const fbxPath = (type === 'cavalry'     && manifest.cavalry)
          ? manifest.cavalry
          : (type === 'catapult'    && (manifest as any).catapult)
            ? (manifest as any).catapult
            : (type === 'boltThrower' && (manifest as any).boltThrower)
              ? (manifest as any).boltThrower
              : manifest.characters;

        return (
          <Suspense key={id} fallback={
            // Procedural stand-in while FBX loads
            <BaseUnit unitId={id} />
          }>
            <FBXUnit
              unitId={id}
              fbxPath={fbxPath}
              texturePath={manifest.texture}
              teamColor={teamColor}
              onSelect={() => useGameStore.getState().selectUnits([id])}
            />
          </Suspense>
        );
      })}
    </group>
  );
}
