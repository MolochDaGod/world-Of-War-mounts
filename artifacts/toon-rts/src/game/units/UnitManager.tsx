import { Suspense } from 'react';
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

/**
 * UnitManager renders each unit.
 *
 * Each unit is wrapped in its own <Suspense> so that one unit failing to
 * load its FBX doesn't kill the whole army — it falls back to the procedural
 * BaseUnit while the FBX streams in.
 */
export function UnitManager() {
  const units = useGameStore(state => state.units);
  const selectedUnitIds = useGameStore(state => state.selectedUnitIds);
  const selectUnits = useGameStore(state => state.selectUnits);

  return (
    <group>
      {units.map(unit => {
        const manifest = AssetManifest[unit.race as keyof typeof AssetManifest];
        const teamColor = TEAM_COLORS[unit.teamId] ?? new THREE.Color('#fff');
        const isSelected = selectedUnitIds.includes(unit.id);

        // Decide which FBX path to use for this unit type
        const fbxPath = (unit.type === 'cavalry' && manifest.cavalry)
          ? manifest.cavalry
          : (unit.type === 'catapult' && (manifest as any).catapult)
            ? (manifest as any).catapult
            : (unit.type === 'boltThrower' && (manifest as any).boltThrower)
              ? (manifest as any).boltThrower
              : manifest.characters;

        return (
          <Suspense key={unit.id} fallback={
            // Procedural stand-in while FBX loads
            <BaseUnit unit={unit} />
          }>
            <FBXUnit
              unit={unit}
              fbxPath={fbxPath}
              texturePath={manifest.texture}
              teamColor={teamColor}
              isSelected={isSelected}
              onSelect={() => selectUnits([unit.id])}
            />
          </Suspense>
        );
      })}
    </group>
  );
}
