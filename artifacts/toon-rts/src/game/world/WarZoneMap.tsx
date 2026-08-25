/**
 * WarZoneMap — the expanded arena dressing and tactical cover layer.
 *
 * ArenaWarzone remains the authored centrepiece. This layer extends the ground
 * and adds shared, stateful cover around it so visuals, movement, and combat
 * all use the same obstacle identities.
 */
import { memo, Suspense, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { BUILD_CATALOG_MAP, type BuildPiece } from '@/game/building/BuildCatalog';
import { useWarZoneStore } from '@/game/store/warZoneStore';
import { WarZoneNature } from './WarZoneManifest';
import type { WarZoneObstacle } from './warZoneData';

const WAR_ZONE_SIZE = 360;
const DEBRIS_GEOMETRY = new THREE.DodecahedronGeometry(1, 0);
const DEBRIS_RING_GEOMETRY = new THREE.RingGeometry(2.2, 3.2, 20);
const DEBRIS_MATERIALS = {
  forest: new THREE.MeshStandardMaterial({ color: '#5b3821', flatShading: true }),
  stone: new THREE.MeshStandardMaterial({ color: '#726c66', flatShading: true }),
};
const DEBRIS_RING_MATERIAL = new THREE.MeshBasicMaterial({
  color: '#d18a42',
  transparent: true,
  opacity: 0.45,
});
const STRUCTURE_MATERIALS = new Map<string, THREE.MeshStandardMaterial>();

function NatureModel({
  path,
  scale,
  castShadow = true,
  receiveShadow = true,
}: {
  path: string;
  scale: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const { scene } = useGLTF(path);
  const clone = useMemo(() => {
    const next = scene.clone(true);
    next.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = castShadow;
        mesh.receiveShadow = receiveShadow;
      }
    });
    return next;
  }, [castShadow, receiveShadow, scene]);

  return <primitive object={clone} scale={scale} />;
}

function TexturedStructure({ piece }: { piece: BuildPiece }) {
  const { scene } = useGLTF(piece.glbPath);
  const texture = useLoader(THREE.TextureLoader, piece.texture!);
  const material = useMemo(() => {
    const key = `${piece.glbPath}:${piece.texture}`;
    const cached = STRUCTURE_MATERIALS.get(key);
    if (cached) return cached;
    const tex = texture.clone();
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1.5, 1.5);
    tex.needsUpdate = true;
    const material = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.88,
      metalness: 0.04,
    });
    STRUCTURE_MATERIALS.set(key, material);
    return material;
  }, [piece.glbPath, piece.texture, texture]);

  const clone = useMemo(() => {
    const next = scene.clone(true);
    next.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.material = material;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return next;
  }, [material, scene]);

  return <primitive object={clone} scale={piece.scale} />;
}

function NativeStructure({ piece }: { piece: BuildPiece }) {
  const { scene } = useGLTF(piece.glbPath);
  const clone = useMemo(() => {
    const next = scene.clone(true);
    next.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return next;
  }, [scene]);

  return <primitive object={clone} scale={piece.scale} />;
}

function StructureModel({ pieceId }: { pieceId: string }) {
  const piece = BUILD_CATALOG_MAP[pieceId];
  if (!piece) return null;
  return piece.texture
    ? <TexturedStructure piece={piece} />
    : <NativeStructure piece={piece} />;
}

function Debris({ obstacle }: { obstacle: WarZoneObstacle }) {
  const seed = obstacle.id.length * 0.37;
  const pieces = useMemo(() => [
    { x: Math.sin(seed) * 1.6, y: 0.55, z: Math.cos(seed) * 1.4, s: 0.9 },
    { x: Math.cos(seed * 1.7) * 2.1, y: 0.35, z: Math.sin(seed * 1.3) * 1.7, s: 0.65 },
    { x: Math.sin(seed * 2.4) * 1.1, y: 0.9, z: Math.cos(seed * 2.1) * 2.0, s: 0.45 },
  ], [seed]);

  return (
    <group>
      {pieces.map((piece, index) => (
        <mesh
          key={`${obstacle.id}-debris-${index}`}
          position={[piece.x, piece.y, piece.z]}
          rotation={[piece.z, seed + index, piece.x]}
          scale={piece.s}
          geometry={DEBRIS_GEOMETRY}
          material={obstacle.kind === 'forest' ? DEBRIS_MATERIALS.forest : DEBRIS_MATERIALS.stone}
          castShadow
        />
      ))}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.04, 0]}
        geometry={DEBRIS_RING_GEOMETRY}
        material={DEBRIS_RING_MATERIAL}
      />
    </group>
  );
}

function ObstacleHealth({ obstacle }: { obstacle: WarZoneObstacle }) {
  if (obstacle.destroyed || obstacle.health >= obstacle.maxHealth) return null;
  const ratio = Math.max(0, obstacle.health / obstacle.maxHealth);
  return (
    <group position={[0, obstacle.kind === 'building' ? 9 : 8, 0]}>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[7, 0.55]} />
        <meshBasicMaterial color="#261818" />
      </mesh>
      <mesh position={[(ratio - 1) * 3.5, 0, 0.01]} scale={[ratio, 1, 1]}>
        <planeGeometry args={[7, 0.38]} />
        <meshBasicMaterial color={ratio > 0.45 ? '#e7bd54' : '#d94d3d'} />
      </mesh>
    </group>
  );
}

const Obstacle = memo(function Obstacle({ obstacle }: { obstacle: WarZoneObstacle }) {
  const [rx, rz] = obstacle.footprint;
  return (
    <group
      position={obstacle.position}
      rotation={[0, obstacle.rotation, 0]}
    >
      <group scale={obstacle.scale}>
        {!obstacle.destroyed && (
          <Suspense fallback={null}>
            {obstacle.pieceId
              ? <StructureModel pieceId={obstacle.pieceId} />
              : <NatureModel path={obstacle.modelPath!} scale={1} />}
          </Suspense>
        )}
        {obstacle.destroyed && <Debris obstacle={obstacle} />}
      </group>
      <ObstacleHealth obstacle={obstacle} />
      {!obstacle.destroyed && obstacle.blocksMovement && (
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[rx, 2.5, rz]} />
        </RigidBody>
      )}
    </group>
  );
});

const detailPatches = [
  [-142, -18, 9, 38, '#4d6d32'],
  [142, 18, 9, 38, '#4d6d32'],
  [-18, -144, 38, 9, '#4d6d32'],
  [18, 144, 38, 9, '#4d6d32'],
  [-138, 54, 20, 12, '#5d7134'],
  [138, -54, 20, 12, '#5d7134'],
] as const;

function WarZoneGround() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.82, 0]} receiveShadow>
        <planeGeometry args={[WAR_ZONE_SIZE, WAR_ZONE_SIZE, 1, 1]} />
        <meshStandardMaterial color="#304d2a" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.78, 0]} receiveShadow>
        <planeGeometry args={[305, 305, 1, 1]} />
        <meshStandardMaterial color="#426531" roughness={1} />
      </mesh>
      {detailPatches.map(([x, z, width, depth, color], index) => (
        <mesh
          key={`terrain-patch-${index}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, -0.73, z]}
          receiveShadow
        >
          <planeGeometry args={[width, depth]} />
          <meshStandardMaterial color={color} roughness={1} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]} receiveShadow>
        <ringGeometry args={[78, 81, 64]} />
        <meshStandardMaterial color="#735c3b" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.69, 0]} receiveShadow>
        <ringGeometry args={[42, 44, 64]} />
        <meshStandardMaterial color="#8a6a3e" roughness={1} />
      </mesh>
    </group>
  );
}

const decorativeNature = [
  [-145, -72, WarZoneNature.tallGrass, 1.8, 0.2],
  [-132, -60, WarZoneNature.fern, 1.5, 1.3],
  [-128, 72, WarZoneNature.tallGrass, 1.7, 2.2],
  [-142, 64, WarZoneNature.fern, 1.4, 0.7],
  [145, 72, WarZoneNature.tallGrass, 1.8, 1.1],
  [132, 60, WarZoneNature.fern, 1.5, 2.8],
  [128, -72, WarZoneNature.tallGrass, 1.7, 2.4],
  [142, -64, WarZoneNature.fern, 1.4, 0.4],
] as const;

function DecorativeNature() {
  return (
    <group>
      {decorativeNature.map(([x, z, path, scale, rotation], index) => (
        <group key={`warzone-detail-${index}`} position={[x, 0, z]} rotation={[0, rotation, 0]}>
          <Suspense fallback={null}>
            <NatureModel path={path} scale={scale} castShadow={false} />
          </Suspense>
        </group>
      ))}
    </group>
  );
}

export function WarZoneMap() {
  const obstacles = useWarZoneStore((state) => state.obstacles);
  return (
    <>
      <WarZoneGround />
      <DecorativeNature />
      <group>
        {obstacles.map((obstacle) => (
          <Obstacle key={obstacle.id} obstacle={obstacle} />
        ))}
      </group>
    </>
  );
}