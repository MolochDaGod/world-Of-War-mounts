/**
 * WorldTrees — decorative FBX trees scattered around the open world.
 * 60 trees using 10 variants from TreeModels, avoiding center radius 45.
 * All random positions are pre-calculated at module level.
 */
import * as THREE from 'three';
import { Suspense, useRef, useMemo, useEffect } from 'react';
import { useLoader } from '@react-three/fiber';
import { useFBX } from '@react-three/drei';
import { TextureLoader, MeshLambertMaterial } from 'three';
import { TreeModels } from '@/game/assets/CraftpixManifest';

// ── Pre-calc 60 tree positions at module level ────────────────────────────────
// Using sin/cos with deterministic seeds — NO Math.random in component render
const TREE_COUNT = 60;
const treePositions: Array<{ x: number; z: number; scale: number; rotY: number; variant: number }> =
  (() => {
    const result = [];
    const avoidRadius = 45;
    for (let i = 0; i < TREE_COUNT; i++) {
      // Deterministic placement using golden angle + sin/cos seeding
      const goldenAngle = 2.399963; // radians
      const angle = i * goldenAngle;
      // Vary radius between 50 and 140
      const seedR = Math.abs(Math.sin(i * 127.1 + 3.7) * 43758.5453);
      const frac = seedR - Math.floor(seedR);
      const r = avoidRadius + 5 + frac * 90;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      // Scale variation
      const seedS = Math.abs(Math.sin(i * 311.7 + x * 0.1) * 43758.5453);
      const fracS = seedS - Math.floor(seedS);
      const scale = 0.010 + fracS * 0.004; // 0.010..0.014
      // Rotation
      const seedRot = Math.abs(Math.sin(i * 91.3 + z * 0.1) * 43758.5453);
      const rotY = (seedRot - Math.floor(seedRot)) * Math.PI * 2;
      result.push({ x, z, scale, rotY, variant: i % 10 });
    }
    return result;
  })();

// ── Single tree instance ──────────────────────────────────────────────────────
interface TreeInstanceProps {
  modelPath: string;
  texturePath: string;
  position: [number, number, number];
  scale: number;
  rotY: number;
}

function TreeInstance({ modelPath, texturePath, position, scale, rotY }: TreeInstanceProps) {
  const fbx = useFBX(modelPath);
  const texture = useLoader(TextureLoader, texturePath);

  const mat = useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    return new MeshLambertMaterial({ map: texture });
  }, [texture]);

  useEffect(() => () => { mat.dispose(); }, [mat]);

  const cloned = useMemo(() => {
    const clone = fbx.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        // Clone the geometry so this instance owns it and can safely dispose it
        mesh.geometry = mesh.geometry.clone();
        mesh.material = mat;
        mesh.castShadow = true;
      }
    });
    return clone;
  }, [fbx, mat]);

  useEffect(() => () => {
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).geometry.dispose();
      }
    });
  }, [cloned]);

  return (
    <group position={position} rotation={[0, rotY, 0]} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}

// ── WorldTrees ────────────────────────────────────────────────────────────────
export function WorldTrees() {
  return (
    <group>
      {treePositions.map((tp, i) => (
        <Suspense key={i} fallback={null}>
          <TreeInstance
            modelPath={TreeModels.models[tp.variant]}
            texturePath={TreeModels.texture}
            position={[tp.x, 0, tp.z]}
            scale={tp.scale}
            rotY={tp.rotY}
          />
        </Suspense>
      ))}
    </group>
  );
}
