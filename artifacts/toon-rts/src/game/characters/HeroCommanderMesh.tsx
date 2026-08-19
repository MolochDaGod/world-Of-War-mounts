/**
 * HeroCommanderMesh — renders a commander's unique hero model in world space.
 *
 * Supports two source formats:
 *  - GLB  (Sketchfab / Mobile Legends exports) — loaded with useGLTF
 *  - FBX  (Unity asset-store packs)            — loaded with useFBX + optional texture
 *
 * The component replaces slot-0 of a commander regiment so the hero visually
 * leads the unit instead of showing the standard FBX soldier.
 *
 * Animations: auto-plays the first clip found in the model if any exist.
 * Static models (no embedded clips) display in their bind pose — intentional;
 * commanders are distinguished by scale, gold aura ring, and unique silhouette.
 */
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useFBX, useTexture, useAnimations } from '@react-three/drei';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';

// ── Shared constants ──────────────────────────────────────────────────────────
const COMMANDER_COLOR   = new THREE.Color('#ffd700');
const COMMANDER_EMISSIVE = new THREE.Color('#bb7700');
const TEAM_COLOR: Record<1 | 2, THREE.Color> = {
  1: new THREE.Color('#6ab4ff'),
  2: new THREE.Color('#dd77dd'),
};

function blendToGold(base: THREE.Color, amt = 0.30) {
  return base.clone().lerp(COMMANDER_COLOR, amt);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function applyGoldMaterial(
  obj: THREE.Object3D,
  teamId: 1 | 2,
  tintAmount = 0.28,
) {
  const base = TEAM_COLOR[teamId].clone();
  const color = blendToGold(base, tintAmount);
  obj.traverse(child => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive:          COMMANDER_EMISSIVE,
      emissiveIntensity: 0.16,
      roughness: 0.6,
      metalness: 0.2,
    });
    mesh.material = mat;
  });
}

function applyTextureMaterial(
  obj: THREE.Object3D,
  texture: THREE.Texture,
  teamId: 1 | 2,
) {
  const tint = TEAM_COLOR[teamId].clone().lerp(COMMANDER_COLOR, 0.18);
  obj.traverse(child => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    mesh.material = new THREE.MeshStandardMaterial({
      map:               texture,
      color:             tint,
      emissive:          COMMANDER_EMISSIVE,
      emissiveIntensity: 0.12,
      roughness: 0.7,
      metalness: 0.1,
    });
  });
}

// ── GLB hero ─────────────────────────────────────────────────────────────────
interface GLBHeroProps {
  modelPath:   string;
  modelScale:  number;
  position:    [number, number, number];
  facing:      number;
  teamId:      1 | 2;
}

function GLBHero({ modelPath, modelScale, position, facing, teamId }: GLBHeroProps) {
  const { scene, animations } = useGLTF(modelPath);

  const cloned = useMemo(() => {
    const c = SkeletonUtils.clone(scene) as THREE.Group;
    c.scale.setScalar(modelScale);
    applyGoldMaterial(c, teamId);
    return c;
  }, [scene, modelScale, teamId]);

  const { actions } = useAnimations(animations, cloned);

  // Auto-play first clip on mount (if any)
  useEffect(() => {
    const first = Object.values(actions)[0];
    if (!first) return;
    first.reset().setLoop(THREE.LoopRepeat, Infinity).setEffectiveTimeScale(0.72).play();
    return () => { first.stop(); };
  }, [actions]);

  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.set(position[0], position[1], position[2]);
    groupRef.current.rotation.y = facing;
  });

  return (
    <group ref={groupRef}>
      <primitive object={cloned} />
    </group>
  );
}

// ── FBX hero ─────────────────────────────────────────────────────────────────
interface FBXHeroProps {
  modelPath:    string;
  texturePath?: string;
  modelScale:   number;
  position:     [number, number, number];
  facing:       number;
  teamId:       1 | 2;
}

// Wrapper to conditionally load texture — hooks must not be called conditionally,
// so we split into two components.
function FBXHeroWithTexture({ modelPath, texturePath, modelScale, position, facing, teamId }: FBXHeroProps) {
  const fbx     = useFBX(modelPath);
  const texture = useTexture(texturePath!);

  const cloned = useMemo(() => {
    const c = fbx.clone(true);
    c.scale.setScalar(modelScale);
    texture.flipY = false;        // FBX UV convention
    texture.colorSpace = THREE.SRGBColorSpace;
    applyTextureMaterial(c, texture, teamId);
    return c;
  }, [fbx, texture, modelScale, teamId]);

  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.set(position[0], position[1], position[2]);
    groupRef.current.rotation.y = facing;
  });

  return (
    <group ref={groupRef}>
      <primitive object={cloned} />
    </group>
  );
}

function FBXHeroNoTexture({ modelPath, modelScale, position, facing, teamId }: FBXHeroProps) {
  const fbx = useFBX(modelPath);

  const cloned = useMemo(() => {
    const c = fbx.clone(true);
    c.scale.setScalar(modelScale);
    applyGoldMaterial(c, teamId);
    return c;
  }, [fbx, modelScale, teamId]);

  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.set(position[0], position[1], position[2]);
    groupRef.current.rotation.y = facing;
  });

  return (
    <group ref={groupRef}>
      <primitive object={cloned} />
    </group>
  );
}

// ── Public component ──────────────────────────────────────────────────────────
export interface HeroCommanderMeshProps {
  modelPath:    string;
  texturePath?: string;
  modelScale:   number;
  position:     [number, number, number];
  facing:       number;
  teamId:       1 | 2;
}

export function HeroCommanderMesh(props: HeroCommanderMeshProps) {
  const isGLB = props.modelPath.toLowerCase().endsWith('.glb');

  if (isGLB) {
    return <GLBHero
      modelPath={props.modelPath}
      modelScale={props.modelScale}
      position={props.position}
      facing={props.facing}
      teamId={props.teamId}
    />;
  }

  // FBX path
  if (props.texturePath) {
    return <FBXHeroWithTexture {...props} />;
  }
  return <FBXHeroNoTexture {...props} />;
}
