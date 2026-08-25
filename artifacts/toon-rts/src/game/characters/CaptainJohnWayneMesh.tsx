/**
 * CaptainJohnWayneMesh — dedicated animated Meshy hero supplied for Captain John Wayne.
 *
 * The asset set is normalized under public assets so the readiness gate and this
 * renderer can load the same authored character and clips.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import type { UnitState } from '@/game/store/gameStore';

const BASE = '/assets/characters/heroes/captain_john_wayne';

export const CAPTAIN_JOHN_WAYNE_PATHS = {
  char:   `${BASE}/jw_char.glb`,
  idle:   `${BASE}/jw_idle.glb`,
  run:    `${BASE}/jw_run.glb`,
  attack: `${BASE}/jw_attack.glb`,
  charge: `${BASE}/jw_charge.glb`,
  dead:   `${BASE}/jw_dead.glb`,
} as const;

const STATE_TO_CLIP: Record<UnitState, string> = {
  idle: 'idle',
  move: 'run',
  attack: 'attack',
  dead: 'dead',
};

function namedClip(clip: THREE.AnimationClip | undefined, name: string) {
  if (!clip) return null;
  const clone = clip.clone();
  clone.name = name;
  return clone;
}

export function CaptainJohnWayneMesh({
  position,
  facing,
  unitState,
  scale = 0.013,
}: {
  position: [number, number, number];
  facing: number;
  unitState: UnitState;
  scale?: number;
}) {
  const { scene } = useGLTF(CAPTAIN_JOHN_WAYNE_PATHS.char);
  const idleG = useGLTF(CAPTAIN_JOHN_WAYNE_PATHS.idle);
  const runG = useGLTF(CAPTAIN_JOHN_WAYNE_PATHS.run);
  const attackG = useGLTF(CAPTAIN_JOHN_WAYNE_PATHS.attack);
  const chargeG = useGLTF(CAPTAIN_JOHN_WAYNE_PATHS.charge);
  const deadG = useGLTF(CAPTAIN_JOHN_WAYNE_PATHS.dead);

  const cloned = useMemo(() => {
    const clone = SkeletonUtils.clone(scene) as THREE.Group;
    clone.scale.setScalar(scale * 1.5);
    clone.traverse(object => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const source = mesh.material as THREE.MeshStandardMaterial;
      const material = source.clone();
      material.color = material.color.clone().lerp(new THREE.Color('#e8bf62'), 0.12);
      material.emissive = new THREE.Color('#4e2d0d');
      material.emissiveIntensity = 0.1;
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
    namedClip(chargeG.animations[0], 'charge'),
    namedClip(deadG.animations[0], 'dead'),
  ].filter((clip): clip is THREE.AnimationClip => Boolean(clip && clip.duration > 0)), [
    idleG, runG, attackG, chargeG, deadG,
  ]);
  const { actions } = useAnimations(allClips, cloned);
  const currentAnim = useRef<string | null>(null);

  useEffect(() => {
    const target = STATE_TO_CLIP[unitState] ?? 'idle';
    if (currentAnim.current === target) return;
    const next = actions[target];
    if (!next) return;
    actions[currentAnim.current ?? '']?.fadeOut(0.22);
    next.reset()
      .setLoop(unitState === 'dead' ? THREE.LoopOnce : THREE.LoopRepeat, Infinity)
      .setEffectiveTimeScale(0.78)
      .setEffectiveWeight(1)
      .fadeIn(0.22)
      .play();
    next.clampWhenFinished = unitState === 'dead';
    currentAnim.current = target;
  }, [actions, unitState]);

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