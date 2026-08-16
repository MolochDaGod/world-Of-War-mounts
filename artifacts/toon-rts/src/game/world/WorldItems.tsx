/**
 * WorldItems — renders chests and dropped weapons from worldStore.
 * Chests bob gently and have a golden glow. Weapons have a faint glow.
 * Click to collect items.
 */
import * as THREE from 'three';
import { Suspense, useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { useFBX } from '@react-three/drei';
import { TextureLoader, MeshLambertMaterial } from 'three';
import { useWorldStore, WorldItem } from '@/game/store/worldStore';
import {
  ChestModels,
  SwordModels,
  HammerModels,
  CaneModels,
} from '@/game/assets/CraftpixManifest';

// ── Chest component ───────────────────────────────────────────────────────────
interface ChestProps {
  item: WorldItem;
}

function ChestInner({ item }: ChestProps) {
  const collectItem = useWorldStore((s) => s.collectItem);
  const modelPath = ChestModels.models[item.modelVariant % 5];
  const fbx = useFBX(modelPath);
  const texture = useLoader(TextureLoader, ChestModels.texture);
  const groupRef = useRef<THREE.Group>(null);
  const [collected, setCollected] = useState(false);
  const baseY = item.position[1];

  const mat = useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    return new MeshLambertMaterial({ map: texture });
  }, [texture]);

  useEffect(() => () => { mat.dispose(); }, [mat]);

  const cloned = useMemo(() => {
    const clone = fbx.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = mat;
        child.castShadow = true;
      }
    });
    return clone;
  }, [fbx, mat]);

  // Bobbing animation
  useFrame(({ clock }) => {
    if (!groupRef.current || collected) return;
    const t = clock.elapsedTime;
    groupRef.current.position.y = baseY + Math.sin(t * 1.5 + item.position[0] * 0.1) * 0.3;
    // Scale to 0 quickly when collected (handled below via state)
  });

  // Collect-animation scale
  useEffect(() => {
    if (collected && groupRef.current) {
      let start: number | null = null;
      const animate = (time: number) => {
        if (start === null) start = time;
        const progress = Math.min((time - start) / 300, 1);
        if (groupRef.current) {
          const s = 1 - progress;
          groupRef.current.scale.setScalar(s * 0.01); // 0.01 is base scale
        }
      };
      // Trigger via requestAnimationFrame would need impure context; use scale directly
    }
  }, [collected]);

  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    if (collected) return;
    setCollected(true);
    collectItem(item.id);
    // Quickly scale to 0
    if (groupRef.current) {
      const scaleDown = () => {
        if (groupRef.current) {
          const cur = groupRef.current.scale.x;
          if (cur > 0.0001) {
            const next = cur * 0.8;
            groupRef.current.scale.setScalar(next);
          }
        }
      };
      const interval = setInterval(scaleDown, 16);
      setTimeout(() => clearInterval(interval), 400);
    }
  }, [collected, item.id, collectItem]);

  return (
    <group
      ref={groupRef}
      position={[item.position[0], baseY, item.position[2]]}
      scale={0.01}
      onClick={handleClick}
    >
      <primitive object={cloned} />
      {/* Golden glow light above chest */}
      <pointLight
        position={[0, 200, 0]}
        color="#ffd700"
        intensity={1.5}
        distance={600}
        castShadow={false}
      />
    </group>
  );
}

function Chest({ item }: ChestProps) {
  return (
    <Suspense fallback={null}>
      <ChestInner item={item} />
    </Suspense>
  );
}

// ── Weapon component ──────────────────────────────────────────────────────────
interface WeaponProps {
  item: WorldItem;
}

function getWeaponModelPath(item: WorldItem): string {
  const variant = item.modelVariant;
  switch (item.kind) {
    case 'sword':
      return SwordModels.models[variant % SwordModels.models.length];
    case 'hammer':
      return HammerModels.models[variant % HammerModels.models.length];
    case 'cane':
      return CaneModels.models[variant % CaneModels.models.length];
    default:
      return SwordModels.models[0];
  }
}

function getWeaponTexturePath(item: WorldItem): string {
  switch (item.kind) {
    case 'sword':  return SwordModels.texture;
    case 'hammer': return HammerModels.texture;
    case 'cane':   return CaneModels.texture;
    default:       return SwordModels.texture;
  }
}

function WeaponInner({ item }: WeaponProps) {
  const collectItem = useWorldStore((s) => s.collectItem);
  const fbx = useFBX(getWeaponModelPath(item));
  const texture = useLoader(TextureLoader, getWeaponTexturePath(item));

  const mat = useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    return new MeshLambertMaterial({ map: texture });
  }, [texture]);

  useEffect(() => () => { mat.dispose(); }, [mat]);

  const cloned = useMemo(() => {
    const clone = fbx.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = mat;
        child.castShadow = true;
      }
    });
    return clone;
  }, [fbx, mat]);

  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    collectItem(item.id);
  }, [item.id, collectItem]);

  // Glow color by weapon type
  const glowColor = item.kind === 'sword' ? '#8888ff'
    : item.kind === 'hammer' ? '#ff8844'
    : '#88ffcc';

  return (
    <group
      position={item.position}
      scale={0.01}
      rotation={[0, Math.sin(item.position[0] * 0.1) * Math.PI, 0]}
      onClick={handleClick}
    >
      <primitive object={cloned} />
      {/* Faint glow */}
      <pointLight
        position={[0, 50, 0]}
        color={glowColor}
        intensity={0.6}
        distance={200}
        castShadow={false}
      />
    </group>
  );
}

function Weapon({ item }: WeaponProps) {
  return (
    <Suspense fallback={null}>
      <WeaponInner item={item} />
    </Suspense>
  );
}

// ── WorldItems ─────────────────────────────────────────────────────────────────
export function WorldItems() {
  const worldItems = useWorldStore((s) => s.worldItems);

  return (
    <group>
      {worldItems
        .filter((item) => !item.collected)
        .map((item) => {
          if (item.kind === 'chest') {
            return <Chest key={item.id} item={item} />;
          }
          return <Weapon key={item.id} item={item} />;
        })}
    </group>
  );
}
