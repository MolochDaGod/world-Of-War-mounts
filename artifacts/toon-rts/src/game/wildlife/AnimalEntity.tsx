import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBX } from '@react-three/drei';
import * as THREE from 'three';
import { AnimalEntity as AnimalEntityType } from '@/game/store/worldStore';
import { AnimalModels } from '@/game/assets/CraftpixManifest';
import { AnimalHealthBar } from './AnimalHealthBar';
import { useWorldStore } from '@/game/store/worldStore';

// ── Scale map (no random — all stable constants) ─────────────────────────────
const ANIMAL_SCALES: Record<string, number> = {
  bear:   0.008,
  wolf:   0.007,
  boar:   0.007,
  deer:   0.009,
  deer2:  0.009,
  fox:    0.006,
  rabbit: 0.004,
  owl:    0.007,
};

// ── FBX path map ──────────────────────────────────────────────────────────────
const ANIMAL_FBX: Record<string, string> = {
  bear:   AnimalModels.bear,
  boar:   AnimalModels.boar,
  deer:   AnimalModels.deer1,
  deer2:  AnimalModels.deer2,
  fox:    AnimalModels.fox,
  owl:    AnimalModels.owl,
  rabbit: AnimalModels.rabbit,
  wolf:   AnimalModels.wolf,
};

// ── Hostile kinds ─────────────────────────────────────────────────────────────
const HOSTILE = new Set(['bear', 'wolf']);

// ── Shared texture loader (one instance) ─────────────────────────────────────
const textureLoader = new THREE.TextureLoader();
const ANIMAL_TEXTURE = textureLoader.load(AnimalModels.texture);
ANIMAL_TEXTURE.flipY = false;
ANIMAL_TEXTURE.colorSpace = THREE.SRGBColorSpace;

// ── Chase glow color ──────────────────────────────────────────────────────────
const GLOW_COLOR = new THREE.Color(1, 0.15, 0.05);

// ── Reusable vectors (module-level, not inside render) ────────────────────────
const _target = new THREE.Vector3();

// ── Inner component that loads the FBX ───────────────────────────────────────
function AnimalFBX({
  kind,
  isHostile,
  isHovered,
  behavior,
  onPointerOver,
  onPointerOut,
  onClick,
}: {
  kind: string;
  isHostile: boolean;
  isHovered: boolean;
  behavior: string;
  onPointerOver: () => void;
  onPointerOut: () => void;
  onClick: () => void;
}) {
  const path = ANIMAL_FBX[kind] ?? AnimalModels.deer1;
  // useFBX clones — safe to mutate this instance
  const fbx = useFBX(path);

  const cloned = useMemo(() => fbx.clone(true), [fbx]);

  // Apply shared texture to every mesh
  useEffect(() => {
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat) => {
          if (mat && (mat as THREE.MeshLambertMaterial).isMaterial) {
            const m = mat as THREE.MeshLambertMaterial;
            m.map = ANIMAL_TEXTURE;
            m.needsUpdate = true;
          }
        });
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [cloned]);

  // Hover tint for hostile animals
  useEffect(() => {
    if (!isHostile) return;
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mats = Array.isArray((child as THREE.Mesh).material)
          ? (child as THREE.Mesh).material as THREE.Material[]
          : [(child as THREE.Mesh).material as THREE.Material];
        mats.forEach((mat) => {
          if (mat && (mat as THREE.MeshLambertMaterial).isMaterial) {
            (mat as THREE.MeshLambertMaterial).color.set(
              isHovered ? '#ff3322' : '#ffffff'
            );
            (mat as THREE.MeshLambertMaterial).needsUpdate = true;
          }
        });
      }
    });
  }, [isHovered, isHostile, cloned]);

  const events = isHostile
    ? { onPointerOver, onPointerOut, onClick }
    : {};

  return (
    <primitive
      object={cloned}
      {...events}
    >
      {/* Chase glow for hostile animals */}
      {isHostile && behavior === 'chase' && (
        <pointLight
          color={GLOW_COLOR}
          intensity={2}
          distance={6}
          decay={2}
          position={[0, 2, 0]}
        />
      )}
    </primitive>
  );
}

// ── Main exported component ───────────────────────────────────────────────────
export function AnimalEntity({ animal }: { animal: AnimalEntityType }) {
  const groupRef   = useRef<THREE.Group>(null);
  const deathTimer = useRef(0);
  const prevPos    = useRef(new THREE.Vector3(animal.position[0], animal.position[1], animal.position[2]));

  const [isHovered, setIsHovered] = useState(false);
  const [visible,   setVisible]   = useState(true);

  const damageAnimal = useWorldStore(s => s.damageAnimal);

  const scale    = ANIMAL_SCALES[animal.kind] ?? 0.007;
  const isHostile = HOSTILE.has(animal.kind);
  const isDead    = animal.behavior === 'dead';

  // Lerp factor — flee uses faster lerp visually
  const lerpFactor = animal.behavior === 'flee' ? 0.08 : 0.05;

  // Set initial world position once on mount
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(
        animal.position[0],
        animal.position[1],
        animal.position[2],
      );
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, delta) => {
    const grp = groupRef.current;
    if (!grp) return;

    if (isDead) {
      deathTimer.current += delta;
      // Fall over: rotate X toward PI/2
      grp.rotation.x = Math.min(Math.PI / 2, grp.rotation.x + delta * 1.2);
      // Fade out meshes
      const opacity = Math.max(0, 1 - deathTimer.current / 3);
      grp.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mats = Array.isArray((child as THREE.Mesh).material)
            ? (child as THREE.Mesh).material as THREE.Material[]
            : [(child as THREE.Mesh).material as THREE.Material];
          mats.forEach((mat) => {
            if (mat) {
              (mat as THREE.MeshLambertMaterial).transparent = true;
              (mat as THREE.MeshLambertMaterial).opacity = opacity;
            }
          });
        }
      });
      if (deathTimer.current >= 3) {
        setVisible(false);
      }
      return;
    }

    // Smooth movement: lerp toward store position
    _target.set(animal.position[0], animal.position[1], animal.position[2]);
    grp.position.lerp(_target, lerpFactor);

    // Face movement direction
    const dx = grp.position.x - prevPos.current.x;
    const dz = grp.position.z - prevPos.current.z;
    if (Math.abs(dx) + Math.abs(dz) > 0.001) {
      const targetAngle = Math.atan2(dx, dz);
      const angleDiff = targetAngle - grp.rotation.y;
      // Normalize angle
      const normalized = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;
      grp.rotation.y += normalized * 0.1;
    }
    prevPos.current.copy(grp.position);
  });

  if (!visible) return null;

  return (
    <group ref={groupRef} scale={scale}>
      <AnimalFBX
        kind={animal.kind}
        isHostile={isHostile}
        isHovered={isHovered}
        behavior={animal.behavior}
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
        onClick={() => damageAnimal(animal.id, 20)}
      />
      {/* Health bar — rendered in world units (scale is already applied by group) */}
      {!isDead && (
        <AnimalHealthBar
          health={animal.health}
          maxHealth={animal.maxHealth}
          yOffset={150} // compensate for model scale (0.007 → 1/0.007 ≈ 143 units in model space)
        />
      )}
    </group>
  );
}
