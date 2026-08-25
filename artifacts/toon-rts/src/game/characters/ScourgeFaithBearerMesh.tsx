/**
 * ScourgeFaithBearerMesh — the dedicated animated Scourge Faith Bearer hero.
 *
 * This slot-zero renderer uses the authored SFB character and animation GLBs,
 * rather than falling back to a generic undead soldier. Its root transform is
 * declarative so a loaded hero never flashes at world origin.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import type { UnitState } from '@/game/store/gameStore';

const BASE = '/assets/characters/heroes/scourge_faith_bearer';

export const SCOURGE_FAITH_BEARER_PATHS = {
  char:   `${BASE}/sfb_char.glb`,
  idle:   `${BASE}/sfb_idle.glb`,
  run:    `${BASE}/sfb_run.glb`,
  attack: `${BASE}/sfb_attack.glb`,
  slam:   `${BASE}/sfb_slam.glb`,
  dead:   `${BASE}/sfb_dead.glb`,
} as const;

const STATE_TO_CLIP: Record<UnitState, string> = {
  idle: 'idle',
  move: 'run',
  attack: 'slam',
  dead: 'dead',
};

function namedClip(clip: THREE.AnimationClip | undefined, name: string) {
  if (!clip) return null;
  const clone = clip.clone();
  clone.name = name;
  return clone;
}

export interface ScourgeFaithBearerMeshProps {
  position: [number, number, number];
  facing: number;
  unitState: UnitState;
  /** Optional director-take override; avoids reducing attack and slam to one state. */
  previewClip?: 'idle' | 'run' | 'attack' | 'slam' | 'dead';
  scale?: number;
}

export function ScourgeFaithBearerMesh({
  position,
  facing,
  unitState,
  previewClip,
  scale = 0.013,
}: ScourgeFaithBearerMeshProps) {
  const { scene } = useGLTF(SCOURGE_FAITH_BEARER_PATHS.char);
  const idleG = useGLTF(SCOURGE_FAITH_BEARER_PATHS.idle);
  const runG = useGLTF(SCOURGE_FAITH_BEARER_PATHS.run);
  const attackG = useGLTF(SCOURGE_FAITH_BEARER_PATHS.attack);
  const slamG = useGLTF(SCOURGE_FAITH_BEARER_PATHS.slam);
  const deadG = useGLTF(SCOURGE_FAITH_BEARER_PATHS.dead);

  const cloned = useMemo(() => {
    const clone = SkeletonUtils.clone(scene) as THREE.Group;
    clone.scale.setScalar(scale * 1.5);
    const teamGold = new THREE.Color('#d29bff');
    clone.traverse(object => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const source = mesh.material as THREE.MeshStandardMaterial;
      const material = source.clone();
      material.color = material.color.clone().lerp(teamGold, 0.18);
      material.emissive = new THREE.Color('#531c77');
      material.emissiveIntensity = 0.16;
      mesh.material = material;
      mesh.castShadow = true;
      mesh.receiveShadow = false;
    });
    return clone;
  }, [scene, scale]);

  const allClips = useMemo(() => [
    namedClip(idleG.animations[0], 'idle'),
    namedClip(runG.animations[0], 'run'),
    namedClip(attackG.animations[0], 'attack'),
    namedClip(slamG.animations[0], 'slam'),
    namedClip(deadG.animations[0], 'dead'),
  ].filter((clip): clip is THREE.AnimationClip => Boolean(clip && clip.duration > 0)), [
    idleG, runG, attackG, slamG, deadG,
  ]);
  const { actions } = useAnimations(allClips, cloned);
  const currentAnim = useRef<string | null>(null);

  useEffect(() => {
    const target = previewClip ?? STATE_TO_CLIP[unitState] ?? 'idle';
    if (currentAnim.current === target) return;
    const next = actions[target];
    if (!next) return;
    const previous = currentAnim.current ? actions[currentAnim.current] : null;
    previous?.fadeOut(0.22);
    const oneShot = previewClip
      ? target === 'attack' || target === 'slam' || target === 'dead'
      : unitState === 'dead';
    next.reset()
      .setLoop(oneShot ? THREE.LoopOnce : THREE.LoopRepeat, oneShot ? 1 : Infinity)
      .setEffectiveTimeScale(0.76)
      .setEffectiveWeight(1)
      .fadeIn(0.22)
      .play();
    next.clampWhenFinished = oneShot;
    currentAnim.current = target;
  }, [unitState, actions, previewClip]);

  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.set(position[0], position[1], position[2]);
    groupRef.current.rotation.y = facing;
  });

  return (
    <group ref={groupRef} position={position} rotation-y={facing}>
      <primitive object={cloned} />
    </group>
  );
}