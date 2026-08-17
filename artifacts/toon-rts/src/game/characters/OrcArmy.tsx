/**
 * OrcArmy — renders all orc (teamId === 2) units from gameStore.
 */
import { Suspense, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, UnitData } from '@/game/store/gameStore';
import { useShallow } from 'zustand/react/shallow';
import { OrcModels } from '@/game/assets/CraftpixManifest';
import {
  useFBXCharacter,
  useAnimMixer,
  BaseFallback,
  SelectionRing,
} from './CharacterBase';

// ─── Model variant tables (module-level, no Math.random in JSX) ───────────────
const WARRIOR_MODELS = [
  OrcModels.warriors[0],
  OrcModels.warriors[1],
  OrcModels.warriors[2],
  OrcModels.warriors[3],
  OrcModels.warriors[4],
];
const PEASANT_MODELS = OrcModels.peasants;

function pickWarriorModel(index: number): string {
  return WARRIOR_MODELS[index % WARRIOR_MODELS.length];
}
function pickPeasantModel(index: number): string {
  return PEASANT_MODELS[index % PEASANT_MODELS.length];
}

// ─── Single orc unit (FBX) ────────────────────────────────────────────────────
function OrcUnitFBX({
  unit,
  fbxPath,
  isSelected,
  scale = 1,
}: {
  unit: UnitData;
  fbxPath: string;
  isSelected: boolean;
  scale?: number;
}) {
  const { scene, animations } = useFBXCharacter(fbxPath, OrcModels.texture);
  const { playClip } = useAnimMixer(scene, animations);
  const groupRef = useRef<THREE.Group>(null);
  const opacityRef = useRef(1);

  // Animate state changes
  useEffect(() => {
    switch (unit.state) {
      case 'move':
        playClip('walk');
        break;
      case 'attack':
        playClip('attack');
        break;
      case 'dead':
        playClip('die');
        break;
      default:
        playClip('idle');
    }
  }, [unit.state, playClip]);

  useFrame((_state, delta) => {
    const grp = groupRef.current;
    if (!grp) return;

    // Lerp toward store position
    const [tx, , tz] = unit.position;
    grp.position.x += (tx - grp.position.x) * 0.12;
    grp.position.z += (tz - grp.position.z) * 0.12;

    // Face direction of movement
    if (unit.targetPosition && unit.state === 'move') {
      const dx = unit.targetPosition[0] - grp.position.x;
      const dz = unit.targetPosition[2] - grp.position.z;
      if (Math.abs(dx) + Math.abs(dz) > 0.05) {
        grp.rotation.y = Math.atan2(dx, dz);
      }
    }

    // Dead fade-out over ~2 seconds
    if (unit.state === 'dead') {
      opacityRef.current = Math.max(0, opacityRef.current - delta / 2);
      grp.traverse((child) => {
        if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
          const mesh = child as THREE.SkinnedMesh;
          const mat = mesh.material as THREE.MeshLambertMaterial;
          mat.transparent = true;
          mat.opacity = opacityRef.current;
        }
      });
      if (opacityRef.current <= 0) grp.visible = false;
    }
  });

  // Set initial position
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(unit.position[0], unit.position[1], unit.position[2]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <group ref={groupRef} scale={scale}>
      <primitive object={scene} />
      <SelectionRing visible={isSelected} radius={1.0} />
    </group>
  );
}

// ─── Per-unit wrapper with Suspense fallback ──────────────────────────────────
function OrcUnit({
  unit,
  index,
  isSelected,
}: {
  unit: UnitData;
  index: number;
  isSelected: boolean;
}) {
  let fbxPath: string;
  let scale = 1;

  if (unit.type === 'cavalry') {
    fbxPath = OrcModels.king;
    scale = 1.3;
  } else if (unit.type === 'catapult' || unit.type === 'boltThrower' || unit.type === 'mage') {
    fbxPath = pickPeasantModel(index);
  } else {
    // infantry (default)
    fbxPath = pickWarriorModel(index);
  }

  return (
    <Suspense
      fallback={
        <group position={unit.position}>
          <BaseFallback color="#4a6a22" />
        </group>
      }
    >
      <OrcUnitFBX
        unit={unit}
        fbxPath={fbxPath}
        isSelected={isSelected}
        scale={scale}
      />
    </Suspense>
  );
}

// ─── OrcArmy ──────────────────────────────────────────────────────────────────
export function OrcArmy() {
  // useShallow caches the last filtered array and returns the same reference
  // when contents are shallowly equal — prevents useSyncExternalStore from
  // seeing a new snapshot on every call and triggering "Maximum update depth exceeded".
  const units = useGameStore(
    useShallow((state) => state.units.filter((u) => u.teamId === 2)),
  );
  const selectedUnitIds = useGameStore(
    useShallow((state) => state.selectedUnitIds),
  );

  return (
    <group name="orc-army">
      {/* Subtle red ambient tint for orc side */}
      <ambientLight color="#ff2200" intensity={0.08} />

      {units.map((unit, idx) => (
        <OrcUnit
          key={unit.id}
          unit={unit}
          index={idx}
          isSelected={selectedUnitIds.includes(unit.id)}
        />
      ))}
    </group>
  );
}
