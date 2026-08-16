/**
 * PlacedBuildings — renders all buildings persisted in worldStore.
 *
 * Two inner components handle the texture split:
 *   TexturedPiece  — applies a retro-fantasy PNG over the GLB geometry
 *   NativePiece    — uses the GLB's own embedded materials (survival / nature kit)
 */
import { Suspense, useMemo, useEffect } from 'react';
import { useLoader } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useWorldStore, type Building } from '@/game/store/worldStore';
import { BUILD_CATALOG_MAP, type BuildPiece } from './BuildCatalog';

// ── Shared ghost material (re-used by BuildSystem) ────────────────────────────
export const GHOST_MAT = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0x44aaff),
  transparent:        true,
  opacity:            0.45,
  emissive:           new THREE.Color(0x2266cc),
  emissiveIntensity:  0.4,
  roughness:          0.6,
  metalness:          0.1,
  depthWrite:         false,
});

// ── Textured piece — retro-fantasy texture replaces GLB material ──────────────
function TexturedPiece({ piece }: { piece: BuildPiece }) {
  const { scene } = useGLTF(piece.glbPath);
  const texture   = useLoader(THREE.TextureLoader, piece.texture!);

  const clone = useMemo(() => {
    const tex     = texture.clone();
    tex.wrapS     = THREE.RepeatWrapping;
    tex.wrapT     = THREE.RepeatWrapping;
    tex.repeat.set(1.5, 1.5);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    const mat = new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.85, metalness: 0.05,
    });
    const c = scene.clone(true);
    c.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.material      = mat;
        mesh.castShadow    = true;
        mesh.receiveShadow = true;
      }
    });
    return c;
  }, [scene, texture]);

  useEffect(() => () => {
    clone.traverse((ch) => {
      const m = (ch as THREE.Mesh).isMesh ? (ch as THREE.Mesh).material as THREE.Material : null;
      m?.dispose();
    });
  }, [clone]);

  return <primitive object={clone} />;
}

// ── Native-material piece — survival/nature kit keeps its own colors ──────────
function NativePiece({ piece }: { piece: BuildPiece }) {
  const { scene } = useGLTF(piece.glbPath);
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow    = true;
        mesh.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);
  return <primitive object={clone} />;
}

// ── Ghost piece — transparent blue preview used by BuildSystem ────────────────
export function GhostPiece({ piece }: { piece: BuildPiece }) {
  const { scene } = useGLTF(piece.glbPath);
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) mesh.material = GHOST_MAT;
    });
    return c;
  }, [scene]);
  return <primitive object={clone} />;
}

// ── Single placed building ────────────────────────────────────────────────────
function PlacedPiece({ building }: { building: Building }) {
  const pieceId = (building as any).pieceId ?? building.kind;
  const piece   = BUILD_CATALOG_MAP[pieceId];
  if (!piece) return null;

  const rotY = ((building as any).rotation ?? 0) * (Math.PI / 2);

  return (
    <group position={building.position} rotation={[0, rotY, 0]} scale={piece.scale}>
      <Suspense fallback={null}>
        {piece.texture
          ? <TexturedPiece piece={piece} />
          : <NativePiece   piece={piece} />}
      </Suspense>
    </group>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function PlacedBuildings() {
  // Stable: buildings reference only changes when a building is added/removed/
  // damaged — NOT on tickTime/moveAnimal/etc., which don't touch the buildings key.
  const buildings = useWorldStore((s) => s.buildings);
  return (
    <group>
      {buildings.map((b) => <PlacedPiece key={b.id} building={b} />)}
    </group>
  );
}
