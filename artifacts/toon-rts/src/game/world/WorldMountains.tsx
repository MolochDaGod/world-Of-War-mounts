/**
 * WorldMountains — FBX mountains, hills, and volcanoes around the world edges.
 * - 8 mountains at radius 100-140
 * - 10 hills at radius 60-90
 * - 2 volcanoes at fixed far positions
 * Volcano lava glow: animated PointLight via useFrame
 */
import * as THREE from 'three';
import { Suspense, useRef } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { useFBX } from '@react-three/drei';
import { TextureLoader, MeshLambertMaterial, PointLight } from 'three';
import { MountainModels, VolcanoModels } from '@/game/assets/CraftpixManifest';

// ── Pre-calc positions at module level ────────────────────────────────────────
function seededFrac(a: number, b: number): number {
  const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

// 8 mountains at edges (radius 100-140)
const mountainPositions: Array<{ x: number; z: number; rotY: number; variant: number }> =
  (() => {
    const result = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const r = 100 + seededFrac(i * 3.1, 7.9) * 40;
      const rotY = seededFrac(i * 5.7, 2.3) * Math.PI * 2;
      result.push({
        x: Math.cos(angle) * r,
        z: Math.sin(angle) * r,
        rotY,
        variant: i % 5,
      });
    }
    return result;
  })();

// 10 hills at radius 60-90
const hillPositions: Array<{ x: number; z: number; rotY: number; variant: number }> =
  (() => {
    const result = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 + 0.3;
      const r = 60 + seededFrac(i * 4.3, 11.2) * 30;
      const rotY = seededFrac(i * 9.1, 3.5) * Math.PI * 2;
      result.push({
        x: Math.cos(angle) * r,
        z: Math.sin(angle) * r,
        rotY,
        variant: i % 5,
      });
    }
    return result;
  })();

// 2 volcanoes at fixed far positions
const volcanoPositions: Array<{ x: number; z: number; rotY: number; variant: number }> = [
  { x: 120, z: 90,   rotY: 0.5, variant: 0 },
  { x: -110, z: -100, rotY: 2.1, variant: 1 },
];

// ── Reusable FBX model component ──────────────────────────────────────────────
interface FbxModelProps {
  modelPath: string;
  texturePath: string;
  position: [number, number, number];
  scale: number;
  rotY: number;
}

function FbxModel({ modelPath, texturePath, position, scale, rotY }: FbxModelProps) {
  const fbx = useFBX(modelPath);
  const texture = useLoader(TextureLoader, texturePath);

  const cloned = (() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    const mat = new MeshLambertMaterial({ map: texture });
    const clone = fbx.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = mat;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  })();

  return (
    <group position={position} rotation={[0, rotY, 0]} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}

// ── Animated lava glow light at volcano ───────────────────────────────────────
function LavaGlow({ position }: { position: [number, number, number] }) {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (!lightRef.current) return;
    const t = clock.elapsedTime;
    // Oscillate intensity between 2 and 8
    lightRef.current.intensity = 2 + (Math.sin(t * 2.3) * 0.5 + 0.5) * 6;
  });

  return (
    <pointLight
      ref={lightRef}
      position={[position[0], position[1] + 8, position[2]]}
      color="#ff4400"
      intensity={5}
      distance={40}
      castShadow={false}
    />
  );
}

// ── WorldMountains ────────────────────────────────────────────────────────────
export function WorldMountains() {
  return (
    <group>
      {/* Mountains at world edges */}
      {mountainPositions.map((mp, i) => (
        <Suspense key={`mountain-${i}`} fallback={null}>
          <FbxModel
            modelPath={MountainModels.mountains[mp.variant]}
            texturePath={MountainModels.texture}
            position={[mp.x, 0, mp.z]}
            scale={0.015}
            rotY={mp.rotY}
          />
        </Suspense>
      ))}

      {/* Hills scattered at mid-range */}
      {hillPositions.map((hp, i) => (
        <Suspense key={`hill-${i}`} fallback={null}>
          <FbxModel
            modelPath={MountainModels.hills[hp.variant]}
            texturePath={MountainModels.texture}
            position={[hp.x, 0, hp.z]}
            scale={0.015}
            rotY={hp.rotY}
          />
        </Suspense>
      ))}

      {/* Volcanoes at far fixed positions */}
      {volcanoPositions.map((vp, i) => (
        <Suspense key={`volcano-${i}`} fallback={null}>
          <FbxModel
            modelPath={VolcanoModels.volcanoes[vp.variant]}
            texturePath={VolcanoModels.texture}
            position={[vp.x, 0, vp.z]}
            scale={0.015}
            rotY={vp.rotY}
          />
          <LavaGlow position={[vp.x, 0, vp.z]} />
        </Suspense>
      ))}
    </group>
  );
}
