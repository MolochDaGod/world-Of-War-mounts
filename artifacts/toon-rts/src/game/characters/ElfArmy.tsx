/**
 * ElfArmy — renders all elf/human (teamId === 1) units from gameStore.
 */
import { Suspense, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, UnitData } from '@/game/store/gameStore';
import { useShallow } from 'zustand/react/shallow';
import { ElfModels, MedievalModels } from '@/game/assets/CraftpixManifest';
import {
  useFBXCharacter,
  useAnimMixer,
  BaseFallback,
  SelectionRing,
} from './CharacterBase';

// ─── Model variant tables (module-level) ──────────────────────────────────────
const COMMONER_MODELS = ElfModels.commoners;   // 4 variants
const NOBLE_MODELS    = ElfModels.nobles;       // 3 variants

function pickCommonerModel(index: number): string {
  return COMMONER_MODELS[index % COMMONER_MODELS.length];
}
function pickNobleModel(index: number): string {
  return NOBLE_MODELS[index % NOBLE_MODELS.length];
}

// ─── Single elf/human unit (FBX) ─────────────────────────────────────────────
function ElfUnitFBX({
  unit,
  fbxPath,
  texturePath,
  isSelected,
  alwaysRing = false,
  scale = 1,
}: {
  unit: UnitData;
  fbxPath: string;
  texturePath: string;
  isSelected: boolean;
  alwaysRing?: boolean;
  scale?: number;
}) {
  const { scene, animations } = useFBXCharacter(fbxPath, texturePath);
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

  const showRing = alwaysRing || isSelected;

  return (
    <group ref={groupRef} scale={scale}>
      <primitive object={scene} />
      <SelectionRing visible={showRing} radius={alwaysRing ? 1.2 : 1.0} />
    </group>
  );
}

// ─── Per-unit wrapper with Suspense fallback ──────────────────────────────────
function ElfUnit({
  unit,
  index,
  isSelected,
}: {
  unit: UnitData;
  index: number;
  isSelected: boolean;
}) {
  let fbxPath: string;
  let texturePath: string = ElfModels.texture;
  let scale = 1;
  let alwaysRing = false;

  if (unit.type === 'cavalry') {
    fbxPath = pickNobleModel(index);
  } else if (unit.type === 'catapult' || unit.type === 'boltThrower') {
    fbxPath = MedievalModels.units[0];
    texturePath = MedievalModels.texture;
    scale = 1.1;
  } else if (unit.type === 'mage') {
    // Hero/king — golden ring always visible
    fbxPath = ElfModels.king;
    scale = 1.15;
    alwaysRing = true;
  } else {
    // infantry
    fbxPath = pickCommonerModel(index);
  }

  return (
    <Suspense
      fallback={
        <group position={unit.position}>
          <BaseFallback color="#3a6e5a" />
        </group>
      }
    >
      <ElfUnitFBX
        unit={unit}
        fbxPath={fbxPath}
        texturePath={texturePath}
        isSelected={isSelected}
        alwaysRing={alwaysRing}
        scale={scale}
      />
    </Suspense>
  );
}

// ─── ElfArmy ──────────────────────────────────────────────────────────────────
export function ElfArmy() {
  // useShallow caches the last filtered array and returns the same reference
  // when contents are shallowly equal — prevents useSyncExternalStore from
  // seeing a new snapshot on every call and triggering "Maximum update depth exceeded".
  const units = useGameStore(
    useShallow((state) => state.units.filter((u) => u.teamId === 1)),
  );
  const selectedUnitIds = useGameStore(
    useShallow((state) => state.selectedUnitIds),
  );

  return (
    <group name="elf-army">
      {/* Subtle blue glow for elf side */}
      <ambientLight color="#2244ff" intensity={0.06} />

      {units.map((unit, idx) => (
        <ElfUnit
          key={unit.id}
          unit={unit}
          index={idx}
          isSelected={selectedUnitIds.includes(unit.id)}
        />
      ))}
    </group>
  );
}
