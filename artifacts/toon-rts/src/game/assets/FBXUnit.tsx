/**
 * FBXUnit — loads a race's character or cavalry FBX with its TGA texture,
 * clones the scene graph for each unit instance, and applies:
 *   - TGA texture map
 *   - Team colour tint via a secondary Lambert material on helmet/shield meshes
 *   - AnimationMixer bound to idle / walk / attack clips from the FBX
 *   - castShadow / receiveShadow on every mesh
 *
 * Uses drei's useFBX (= useLoader(FBXLoader, url) + caching) so the same
 * FBX is only parsed once; all instances share the geometry and material.
 */
import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { useFBX } from '@react-three/drei';
import { TGALoader } from 'three/examples/jsm/loaders/TGALoader.js';
import * as THREE from 'three';
import { UnitData } from '../store/gameStore';

interface FBXUnitProps {
  unit: UnitData;
  fbxPath: string;
  texturePath: string;
  teamColor: THREE.Color;
  isSelected: boolean;
  onSelect: () => void;
}

// Material cache — reuse across instances sharing the same texture
const matCache = new Map<string, THREE.MeshLambertMaterial>();

function getMaterial(texturePath: string, texture: THREE.Texture) {
  if (!matCache.has(texturePath)) {
    const mat = new THREE.MeshLambertMaterial({ map: texture });
    mat.map!.colorSpace = THREE.SRGBColorSpace;
    matCache.set(texturePath, mat);
  }
  return matCache.get(texturePath)!;
}

export function FBXUnit({ unit, fbxPath, texturePath, teamColor, isSelected, onSelect }: FBXUnitProps) {
  const groupRef  = useRef<THREE.Group>(null);
  const mixerRef  = useRef<THREE.AnimationMixer | null>(null);

  // Load FBX — cached globally by drei (only parsed once per path)
  const fbxSource = useFBX(fbxPath);

  // Load TGA texture — cached by R3F useLoader
  const texture = useLoader(TGALoader, texturePath);

  const baseMat  = useMemo(() => getMaterial(texturePath, texture), [texturePath, texture]);
  const teamMat  = useMemo(() => new THREE.MeshLambertMaterial({ color: teamColor }), [teamColor]);
  const ringMat  = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#f5a623', transparent: true, opacity: 0.85, depthWrite: false,
  }), []);

  // Clone the FBX scene once per unit — full deep clone including SkinnedMesh + Skeleton
  const cloned = useMemo(() => {
    const c = fbxSource.clone(true);

    // Re-bind skeleton after deep clone
    const skinnedMeshes: THREE.SkinnedMesh[] = [];
    const boneMap = new Map<string, THREE.Bone>();

    c.traverse((n) => {
      if (n instanceof THREE.Bone) boneMap.set(n.name, n);
    });
    c.traverse((n) => {
      if (n instanceof THREE.SkinnedMesh) {
        n.castShadow     = true;
        n.receiveShadow  = true;
        // Apply base texture material
        n.material       = baseMat.clone();
        // Bind to cloned skeleton
        if (n.skeleton) {
          const newBones = n.skeleton.bones.map(b => boneMap.get(b.name) ?? b);
          n.skeleton      = new THREE.Skeleton(newBones, n.skeleton.boneInverses);
          n.bind(n.skeleton, n.bindMatrix);
        }
        skinnedMeshes.push(n);
      } else if (n instanceof THREE.Mesh) {
        n.castShadow    = true;
        n.receiveShadow = true;
        n.material      = baseMat.clone();
      }
    });

    // Scale down from artist units (FBX typically in cm → metres)
    c.scale.setScalar(0.012);

    return c;
  }, [fbxSource, baseMat]);

  // Animation mixer — bind once cloned scene is ready
  useEffect(() => {
    const clips = fbxSource.animations;
    if (!clips || clips.length === 0) return;

    const mixer = new THREE.AnimationMixer(cloned);
    mixerRef.current = mixer;

    const play = (nameHint: string, fallbackIdx = 0) => {
      const clip = clips.find(c =>
        c.name.toLowerCase().includes(nameHint),
      ) ?? clips[fallbackIdx];
      if (clip) {
        const action = mixer.clipAction(clip);
        action.reset().play();
        return action;
      }
      return null;
    };

    // Start idle by default
    play('idle', 0);

    return () => { mixer.stopAllAction(); mixerRef.current = null; };
  }, [cloned, fbxSource.animations]);

  // Switch animations when unit state changes
  const prevState = useRef<string>('');
  useEffect(() => {
    const mixer = mixerRef.current;
    const clips = fbxSource.animations;
    if (!mixer || !clips?.length) return;
    if (prevState.current === unit.state) return;
    prevState.current = unit.state;

    mixer.stopAllAction();
    const hint = unit.state === 'move' ? 'run'
               : unit.state === 'attack' ? 'attack'
               : unit.state === 'dead' ? 'death'
               : 'idle';
    const clip = clips.find(c => c.name.toLowerCase().includes(hint)) ?? clips[0];
    if (clip) {
      const action = mixer.clipAction(clip);
      action.reset();
      if (unit.state === 'dead') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      action.play();
    }
  }, [unit.state, fbxSource.animations]);

  // Per-frame: lerp position, face target, advance mixer
  useFrame((_, delta) => {
    const grp = groupRef.current;
    if (!grp) return;

    // Position lerp — CombatSystem drives unit.position
    const [tx, , tz] = unit.position;
    grp.position.x += (tx - grp.position.x) * 0.18;
    grp.position.z += (tz - grp.position.z) * 0.18;

    // Rotate toward movement direction
    if (unit.state === 'move' && unit.targetPosition) {
      const dx = unit.targetPosition[0] - grp.position.x;
      const dz = unit.targetPosition[2] - grp.position.z;
      if (Math.abs(dx) + Math.abs(dz) > 0.05) {
        const angle = Math.atan2(dx, dz);
        grp.rotation.y += (angle - grp.rotation.y) * 0.2;
      }
    }

    // Death tilt
    if (unit.state === 'dead') {
      grp.rotation.x += 0.025;
      grp.scale.y = Math.max(0.001, grp.scale.y - 0.015);
    }

    // Advance animation
    mixerRef.current?.update(delta);
  });

  // Set initial position
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(unit.position[0], 0, unit.position[2]);
    }
  }, []); // eslint-disable-line

  const hpPct = unit.health / unit.maxHealth;
  const hpColor = hpPct > 0.6 ? '#22c55e' : hpPct > 0.3 ? '#eab308' : '#ef4444';

  return (
    <group
      ref={groupRef}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {/* Actual FBX model */}
      <primitive object={cloned} />

      {/* Team colour flag above unit */}
      <mesh position={[0, 2.2, 0]}>
        <boxGeometry args={[0.18, 0.5, 0.08]} />
        <meshLambertMaterial color={teamColor} emissive={teamColor} emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 2.62, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.2, 4]} />
        <meshLambertMaterial color="#8b6914" />
      </mesh>

      {/* Selection ring on ground */}
      {isSelected && (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.95, 32]} />
          <primitive object={ringMat} />
        </mesh>
      )}

      {/* HP bar (HTML overlay, scaled by camera distance) */}
      {unit.state !== 'dead' && (
        <mesh position={[0, 2.8, 0]}>
          {/* background */}
          <planeGeometry args={[0.8, 0.09]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.5} depthTest={false} />
        </mesh>
      )}
      {unit.state !== 'dead' && (
        <mesh position={[-0.4 + (hpPct * 0.4), 2.8, 0.01]}>
          <planeGeometry args={[0.8 * hpPct, 0.07]} />
          <meshBasicMaterial color={hpColor} depthTest={false} />
        </mesh>
      )}
    </group>
  );
}
